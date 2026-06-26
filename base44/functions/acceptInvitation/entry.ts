import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('[ACCEPT_INVITATION] Processing for user:', user.email, user.id);
    
    // Find all pending invitations for this user's email
    const invitations = await base44.entities.Invitation.filter({
      email: user.email,
      status: 'pending'
    });
    
    console.log('[ACCEPT_INVITATION] Found', invitations.length, 'pending invitations');
    
    if (invitations.length === 0) {
      return Response.json({ 
        success: true, 
        message: 'No pending invitations',
        workspaceMemberCreated: false 
      });
    }
    
    let workspaceMemberCreated = false;
    const acceptedInvitations = [];
    
    // Process each invitation
    for (const invitation of invitations) {
      try {
        console.log('[ACCEPT_INVITATION] Processing invitation:', invitation.id);
        
        // Check if WorkspaceMember already exists for this user+workspace
        const existingMember = await base44.entities.WorkspaceMember.filter({
          workspace: invitation.workspace,
          user: user.id
        }).then(members => members[0] || null);
        
        if (existingMember) {
          console.log('[ACCEPT_INVITATION] WorkspaceMember already exists for workspace:', invitation.workspace);
          // Update existing member with invitation details if needed
          if (existingMember.status === 'invited' || existingMember.status === 'active') {
            await base44.entities.WorkspaceMember.update(existingMember.id, {
              status: 'active',
              joined_date: new Date().toISOString().split('T')[0],
              last_active_date: new Date().toISOString().split('T')[0],
            });
          }
        } else {
          console.log('[ACCEPT_INVITATION] Creating new WorkspaceMember for workspace:', invitation.workspace);
          // Create WorkspaceMember record with actual user ID
          const newMember = await base44.entities.WorkspaceMember.create({
            workspace: invitation.workspace,
            workspace_name: invitation.workspace_name,
            user: user.id,
            user_name: user.full_name,
            user_email: user.email,
            role: invitation.role,
            account_role: invitation.account_role,
            department: invitation.department,
            status: 'active',
            access_type: invitation.invitation_scope === 'workboards_only' ? 'selected_workboards' : 'all_workboards',
            accessible_workboards: invitation.invitation_scope === 'workboards_only' ? (invitation.workboards || []) : [],
            invited_by: invitation.invited_by,
            joined_date: new Date().toISOString().split('T')[0],
            automation_permissions: 'personal',
          });
          console.log('[ACCEPT_INVITATION] WorkspaceMember created:', newMember.id);
          workspaceMemberCreated = true;
        }
        
        // Update invitation status to accepted
        await base44.entities.Invitation.update(invitation.id, {
          status: 'accepted',
          accepted_date: new Date().toISOString(),
        });
        
        acceptedInvitations.push({
          invitationId: invitation.id,
          workspace: invitation.workspace,
          workspaceName: invitation.workspace_name,
        });
        
        console.log('[ACCEPT_INVITATION] Invitation accepted:', invitation.id);
      } catch (error) {
        console.error('[ACCEPT_INVITATION] Error processing invitation:', invitation.id, error);
        // Continue processing other invitations
      }
    }
    
    console.log('[ACCEPT_INVITATION] Completed. Accepted', acceptedInvitations.length, 'invitations');
    
    return Response.json({
      success: true,
      message: `Accepted ${acceptedInvitations.length} invitation(s)`,
      workspaceMemberCreated,
      acceptedInvitations,
    });
  } catch (error) {
    console.error('[ACCEPT_INVITATION] Error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});