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

    // Create notifications
    const recipients = new Set();
    if (form.workboard) {
      const board = await base44.asServiceRole.entities.Workboard.get(form.workboard).catch(() => null);
      if (board?.owner) recipients.add(board.owner);
    }
    if (form.owner) recipients.add(form.owner);
    if (item?.owner) recipients.add(item.owner);

    for (const recipientId of recipients) {
      if (recipientId === user.id) continue;
      const isOwnerAssign = item?.owner === recipientId;
      await base44.asServiceRole.entities.Notification.create({
        workspace: form.workspace,
        workboard: form.workboard || null,
        recipient: recipientId,
        sender: user.id,
        sender_name: user.full_name || user.email,
        type: isOwnerAssign ? 'assignment' : 'system',
        title: isOwnerAssign ? 'You have been assigned' : `New form submission: ${form.title}`,
        message: isOwnerAssign
          ? `You have been assigned to an item created from form "${form.title}"${itemTitle ? `: "${itemTitle}"` : ''}`
          : `${user.full_name || user.email} submitted "${form.title}"${itemTitle ? `, creating item "${itemTitle}"` : ''}`,
        record_type: 'FormSubmission',
        record_id: submission.id,
        target_url: item ? `/workboards/${form.workboard}` : `/forms/${formId}/submissions`,
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