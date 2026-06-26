import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { formId, values, fileUrls, linkedItemId } = body;

    if (!formId) return Response.json({ error: 'formId is required' }, { status: 400 });

    const form = await base44.asServiceRole.entities.Form.get(formId);
    if (!form) return Response.json({ error: 'Form not found' }, { status: 404 });
    if (form.status !== 'published' && form.status !== 'active') {
      return Response.json({ error: 'Form is not published' }, { status: 400 });
    }

    // Validate user has access to the form's workspace
    if (form.workspace) {
      const membership = await base44.asServiceRole.entities.WorkspaceMember.filter({
        workspace: form.workspace,
        user: user.id,
        status: 'active'
      }).then(m => m[0] || null);

      // Allow public forms or workspace members
      if (form.visibility !== 'public' && !membership && user.account_role !== 'system_admin') {
        return Response.json({ error: 'Forbidden: No access to this form' }, { status: 403 });
      }
    }

    // Validate file URLs for security (prevent external URLs)
    if (fileUrls) {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      for (const fieldId in fileUrls) {
        const urls = fileUrls[fieldId];
        if (Array.isArray(urls)) {
          for (const url of urls) {
            // Only allow URLs from trusted domains (Base44 storage)
            if (!url.includes('base44.com') && !url.startsWith('/api/')) {
              return Response.json({ error: 'Invalid file URL: must be from trusted storage' }, { status: 400 });
            }
          }
        }
      }
    }

    const fields = await base44.asServiceRole.entities.FormField.filter({ form: formId });
    fields.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    const isFileField = (ft) => ft === 'file_upload' || ft === 'image_upload';
    const isDisplayOnly = (ft) => ft === 'section_header' || ft === 'description_text';

    // Validate required fields
    for (const field of fields) {
      if (isDisplayOnly(field.field_type)) continue;
      if (!field.required) continue;
      const val = values?.[field.id];
      const fileVal = fileUrls?.[field.id];
      const isEmpty = (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0))
        && (!fileVal || !Array.isArray(fileVal) || fileVal.length === 0);
      if (isEmpty) {
        return Response.json({ error: `"${field.label}" is required` }, { status: 400 });
      }
    }

    const isStandalone = form.form_type === 'standalone_form';

    // Create submission record
    const submission = await base44.asServiceRole.entities.FormSubmission.create({
      workspace: form.workspace,
      form: formId,
      workboard: form.workboard || null,
      submitted_by: user.id,
      submitter_name: user.full_name || user.email,
      submitter_email: user.email,
      status: 'pending',
      source: 'internal',
      linked_item: linkedItemId || null,
    });

    // Create submission values
    const subValues = [];
    for (const field of fields) {
      if (isDisplayOnly(field.field_type)) continue;
      let val = values?.[field.id];

      if (isFileField(field.field_type)) {
        const urls = fileUrls?.[field.id];
        if (urls && Array.isArray(urls) && urls.length > 0) {
          val = urls.map(u => decodeURIComponent(u.split('/').pop()?.split('?')[0] || 'file')).join(', ');
        }
      }

      if (val === undefined || val === null || val === '') continue;
      const isArr = Array.isArray(val);
      subValues.push({
        workspace: form.workspace,
        form: formId,
        submission: submission.id,
        field: field.id,
        value: isArr ? JSON.stringify(val) : String(val),
        display_value: isArr ? val.join(', ') : String(val),
      });
    }
    if (subValues.length > 0) {
      await base44.asServiceRole.entities.FormSubmissionValue.bulkCreate(subValues);
    }

    let item = null;
    let itemTitle = null;

    if (!isStandalone && form.workboard) {
      // Workboard form: create WorkboardItem
      const itemData = {
        workspace: form.workspace,
        workboard: form.workboard,
        title: `${form.title} - ${new Date().toLocaleString()}`,
        sort_order: 0,
        created_by: user.id,
      };

      // Assign to default group
      const groups = await base44.asServiceRole.entities.BoardGroup.filter({ workboard: form.workboard, archived: false }).catch(() => []);
      if (groups.length > 0) {
        const sorted = groups.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        itemData.group = sorted[0].id;
      }

      // Apply system field mappings
      for (const field of fields) {
        if (!field.mapped_system_field) continue;
        const val = values?.[field.id];
        if (val === undefined || val === null || val === '') continue;
        switch (field.mapped_system_field) {
          case 'title': itemData.title = String(val); break;
          case 'owner': itemData.owner = String(val); itemData.assignee = String(val); break;
          case 'status': itemData.status = String(val); break;
          case 'priority': itemData.priority = String(val); break;
          case 'due_date': itemData.due_date = String(val); break;
          case 'progress_percentage': itemData.progress_percentage = Number(val) || 0; break;
        }
      }

      // Look up status/priority colors
      if (itemData.status) {
        const statusOpts = await base44.asServiceRole.entities.StatusOption.filter({ workboard: form.workboard }).catch(() => []);
        const match = statusOpts.find(s => s.label === itemData.status);
        if (match) itemData.status_color = match.color;
      }
      if (itemData.priority) {
        const priOpts = await base44.asServiceRole.entities.PriorityOption.filter({ workboard: form.workboard }).catch(() => []);
        const match = priOpts.find(p => p.label === itemData.priority);
        if (match) itemData.priority_color = match.color;
      }

      item = await base44.asServiceRole.entities.WorkboardItem.create(itemData);
      itemTitle = itemData.title;

      // Update submission with created item
      await base44.asServiceRole.entities.FormSubmission.update(submission.id, {
        created_item: item.id,
        status: 'processed',
        values: JSON.stringify(subValues.map(v => ({ field: v.field, value: v.display_value }))),
      });

      // Create WorkboardItemValue records for mapped custom columns
      const itemValues = [];
      for (const field of fields) {
        if (!field.mapped_column) continue;
        const val = values?.[field.id];
        if (val === undefined || val === null || val === '') continue;
        const isArr = Array.isArray(val);
        itemValues.push({
          workspace: form.workspace,
          workboard: form.workboard,
          item: item.id,
          column: field.mapped_column,
          value: isArr ? JSON.stringify(val) : String(val),
          display_value: isArr ? val.join(', ') : String(val),
          value_type: field.field_type,
          created_by: user.id,
        });
      }
      if (itemValues.length > 0) {
        await base44.asServiceRole.entities.WorkboardItemValue.bulkCreate(itemValues);
      }

      // Create Attachment records
      const attachments = [];
      for (const field of fields) {
        if (!isFileField(field.field_type)) continue;
        const urls = fileUrls?.[field.id];
        if (!urls || !Array.isArray(urls)) continue;
        for (const url of urls) {
          const fileName = decodeURIComponent(url.split('/').pop()?.split('?')[0] || 'file');
          const ext = fileName.split('.').pop()?.toLowerCase() || '';
          attachments.push({
            workspace: form.workspace,
            workboard: form.workboard,
            item: item.id,
            uploaded_by: user.id,
            file_name: fileName,
            file_type: ext,
            file_url: url,
            file_uri: url,
            category: 'item_file',
          });
        }
      }
      if (attachments.length > 0) {
        await base44.asServiceRole.entities.Attachment.bulkCreate(attachments);
      }
    } else {
      // Standalone form: just mark as processed
      await base44.asServiceRole.entities.FormSubmission.update(submission.id, {
        status: 'processed',
        values: JSON.stringify(subValues.map(v => ({ field: v.field, value: v.display_value }))),
      });
    }

    // Increment form submission count
    await base44.asServiceRole.entities.Form.update(formId, {
      submission_count: (form.submission_count || 0) + 1,
    });

    // Create assignment notification for the assigned owner/assignee
    if (item?.owner && item.owner !== user.id) {
      await base44.asServiceRole.entities.Notification.create({
        workspace: form.workspace,
        workboard: form.workboard || null,
        recipient: item.owner,
        sender: user.id,
        sender_name: user.full_name || user.email,
        type: 'assignment',
        title: 'You were assigned',
        message: `${user.full_name || user.email} assigned you to ${itemTitle || 'an item'}`,
        record_type: 'WorkboardItem',
        record_id: item.id,
        target_url: `/workboards/${form.workboard}?item=${item.id}&tab=overview`,
        read_status: false,
      }).catch(() => {});
    }

    // Create system notification for board owner and form owner (skip duplicates with assignment recipient)
    const systemRecipients = new Set();
    if (form.workboard) {
      const board = await base44.asServiceRole.entities.Workboard.get(form.workboard).catch(() => null);
      if (board?.owner && board.owner !== user.id && board.owner !== item?.owner) systemRecipients.add(board.owner);
    }
    if (form.owner && form.owner !== user.id && form.owner !== item?.owner) systemRecipients.add(form.owner);

    for (const recipientId of systemRecipients) {
      await base44.asServiceRole.entities.Notification.create({
        workspace: form.workspace,
        workboard: form.workboard || null,
        recipient: recipientId,
        sender: user.id,
        sender_name: user.full_name || user.email,
        type: 'system',
        title: `New form submission: ${form.title}`,
        message: `${user.full_name || user.email} submitted "${form.title}"${itemTitle ? `, creating item "${itemTitle}"` : ''}`,
        record_type: 'FormSubmission',
        record_id: submission.id,
        target_url: item ? `/workboards/${form.workboard}` : `/forms/${formId}/submissions`,
        read_status: false,
      }).catch(() => {});
    }

    // Activity log
    await base44.asServiceRole.entities.Activity.create({
      workspace: form.workspace,
      user: user.id,
      user_name: user.full_name || user.email,
      action: 'form_submitted',
      record_type: 'FormSubmission',
      record_id: submission.id,
      record_name: form.title,
    }).catch(() => {});

    return Response.json({
      success: true,
      submission_id: submission.id,
      item_id: item?.id || null,
      item_title: itemTitle,
      is_standalone: isStandalone,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});