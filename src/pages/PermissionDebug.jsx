import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useWorkspace } from '@/lib/WorkspaceContext';
import usePermissions from '@/hooks/usePermissions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, User, Building2, LayoutGrid, Key, Check, X } from 'lucide-react';

export default function PermissionDebug() {
  const { user, currentWorkspaceId, currentWorkspace } = useWorkspace();
  const {
    accountRole,
    accountRoleLabel,
    accountPermissions,
    workspaceRole,
    workspaceRoleLabel,
    workspacePermissions,
    canViewExecutiveDashboard,
    canManageMembers,
    canCreateAutomation,
    automationScope,
    accessibleWorkboards,
    workboardMemberships,
    loading,
  } = usePermissions();

  const [workboardDetails, setWorkboardDetails] = useState([]);

  useEffect(() => {
    if (!currentWorkspaceId || !workboardMemberships) return;
    
    const loadDetails = async () => {
      const workboardIds = Object.keys(workboardMemberships);
      if (workboardIds.length === 0) return;
      
      const workboards = await base44.entities.Workboard.filter({ 
        workspace: currentWorkspaceId 
      }).catch(() => []);
      
      const details = workboardIds.map(id => {
        const wb = workboards.find(w => w.id === id);
        const membership = workboardMemberships[id];
        return {
          id,
          name: wb?.name || 'Unknown',
          role: membership?.role || 'viewer',
          visibility: wb?.visibility || 'public_workspace',
        };
      });
      
      setWorkboardDetails(details);
    };
    
    loadDetails();
  }, [currentWorkspaceId, workboardMemberships]);

  if (loading) {
    return (
      <div className="py-16 text-center">
        <div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Loading permission diagnostics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Permission Diagnostics</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Debug view for troubleshooting access control</p>
      </div>

      {/* User Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4" />
            Current User
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
              {user?.full_name?.split(' ').map(n => n[0]).slice(0, 2).join('') || 'U'}
            </div>
            <div>
              <p className="text-sm font-medium">{user?.full_name || 'Unknown'}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Role */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Account Role (Organization)
          </CardTitle>
          <CardDescription>System-wide permissions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Role</span>
            <Badge variant="outline">{accountRoleLabel || 'None'}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Role Key</span>
            <code className="text-xs bg-muted px-2 py-1 rounded">{accountRole}</code>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Can View Executive Dashboard</span>
            {canViewExecutiveDashboard ? (
              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                <Check className="w-3 h-3 mr-1" /> Yes
              </Badge>
            ) : (
              <Badge variant="secondary">
                <X className="w-3 h-3 mr-1" /> No
              </Badge>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Can Manage Members</span>
            {canManageMembers ? (
              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                <Check className="w-3 h-3 mr-1" /> Yes
              </Badge>
            ) : (
              <Badge variant="secondary">
                <X className="w-3 h-3 mr-1" /> No
              </Badge>
            )}
          </div>
          <div className="pt-3 border-t">
            <p className="text-xs font-semibold mb-2">Key Permissions:</p>
            <div className="grid grid-cols-2 gap-2">
              {accountPermissions && Object.entries(accountPermissions).filter(([_, v]) => typeof v === 'boolean' && v).slice(0, 6).map(([key]) => (
                <div key={key} className="text-xs text-muted-foreground flex items-center gap-1">
                  <Check className="w-3 h-3 text-green-600" />
                  {key.replace(/can/g, '').replace(/([A-Z])/g, ' $1').trim()}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workspace Role */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Workspace Role
          </CardTitle>
          <CardDescription>{currentWorkspace?.workspace_name || 'Current workspace'}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Role</span>
            <Badge variant="outline">{workspaceRoleLabel || 'None'}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Role Key</span>
            <code className="text-xs bg-muted px-2 py-1 rounded">{workspaceRole}</code>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Automation Scope</span>
            <Badge variant="secondary">{automationScope}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Accessible Workboards</span>
            <Badge>{accessibleWorkboards?.length || 0}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Workboard Memberships */}
      {workboardDetails.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <LayoutGrid className="w-4 h-4" />
              Workboard Memberships
            </CardTitle>
            <CardDescription>Board-level access</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {workboardDetails.map(wb => (
                <div key={wb.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div>
                    <p className="text-sm font-medium">{wb.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{wb.visibility}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {wb.role.replace('workboard_', '').replace('_', ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Automation Permissions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Key className="w-4 h-4" />
            Automation Permissions
          </CardTitle>
          <CardDescription>What automations can be created</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
            <span className="text-sm">Organization</span>
            {canCreateAutomation('organization') ? (
              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">Allowed</Badge>
            ) : (
              <Badge variant="secondary">Denied</Badge>
            )}
          </div>
          <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
            <span className="text-sm">Workspace</span>
            {canCreateAutomation('workspace') ? (
              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">Allowed</Badge>
            ) : (
              <Badge variant="secondary">Denied</Badge>
            )}
          </div>
          <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
            <span className="text-sm">Workboard</span>
            {canCreateAutomation('workboard') ? (
              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">Allowed</Badge>
            ) : (
              <Badge variant="secondary">Denied</Badge>
            )}
          </div>
          <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
            <span className="text-sm">Personal</span>
            {canCreateAutomation('personal') ? (
              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">Allowed</Badge>
            ) : (
              <Badge variant="secondary">Denied</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Debug Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Raw Debug Data</CardTitle>
          <CardDescription>For troubleshooting</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-96">
            {JSON.stringify({
              user: { id: user?.id, email: user?.email, full_name: user?.full_name },
              accountRole,
              workspaceRole,
              currentWorkspaceId,
              automationScope,
              accessibleWorkboardsCount: accessibleWorkboards?.length,
              workboardMembershipsCount: Object.keys(workboardMemberships || {}).length,
            }, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}