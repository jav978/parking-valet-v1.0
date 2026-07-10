import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { RoleService, CreateRoleRequest, UpdateRoleRequest } from '../../core/services/role.service';
import { PermissionService } from '../../core/services/permission.service';
import { Role, Permission } from '../../core/interfaces/user';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    MessageModule,
    ToastModule,
    ConfirmDialogModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './roles.html',
  styleUrl: './roles.scss'
})
export class Roles implements OnInit {
  private roleService = inject(RoleService);
  private permissionService = inject(PermissionService);
  private toast = inject(MessageService);
  private confirmationService = inject(ConfirmationService);

  roles = signal<Role[]>([]);
  allPermissions = signal<Permission[]>([]);
  loading = signal(false);
  submitting = signal(false);
  submittingPermissions = signal(false);

  showFormDialog = false;
  isEditMode = false;
  selectedRole = signal<Role | null>(null);

  form = {
    name: '',
    description: ''
  };

  showPermissionsDialog = false;
  selectedPermissionIds = signal<Set<string>>(new Set<string>());

  groupedPermissions = computed(() => {
    const groups: { [key: string]: Permission[] } = {};
    this.allPermissions().forEach(p => {
      const moduleName = p.module || 'General';
      if (!groups[moduleName]) {
        groups[moduleName] = [];
      }
      groups[moduleName].push(p);
    });
    return Object.entries(groups).map(([name, permissions]) => ({
      name,
      permissions
    }));
  });

  ngOnInit(): void {
    this.loadRoles();
    this.loadAllPermissions();
  }

  loadRoles(): void {
    this.loading.set(true);
    this.roleService.getRoles()
      .pipe(
        catchError(err => {
          const errMsg = err.error?.message || 'Error al cargar roles';
          this.toast.add({ severity: 'error', summary: 'Error', detail: errMsg });
          this.loading.set(false);
          return of({ data: [] });
        })
      )
      .subscribe(res => {
        this.roles.set(res.data || []);
        this.loading.set(false);
      });
  }

  loadAllPermissions(): void {
    this.permissionService.getPermissions()
      .pipe(
        catchError(() => {
          this.toast.add({ severity: 'error', summary: 'Error', detail: 'Error al cargar los permisos del sistema' });
          return of({ data: [] });
        })
      )
      .subscribe(res => {
        this.allPermissions.set(res.data || []);
      });
  }

  openCreateDialog(): void {
    this.isEditMode = false;
    this.selectedRole.set(null);
    this.form = {
      name: '',
      description: ''
    };
    this.showFormDialog = true;
  }

  openEditDialog(role: Role): void {
    this.isEditMode = true;
    this.selectedRole.set(role);
    this.form = {
      name: role.name,
      description: role.description || ''
    };
    this.showFormDialog = true;
  }

  hideDialog(): void {
    this.showFormDialog = false;
    this.submitting.set(false);
  }

  saveRole(): void {
    if (!this.form.name) {
      return;
    }

    this.submitting.set(true);

    if (this.isEditMode && this.selectedRole()) {
      const roleId = this.selectedRole()!.id;
      const request: UpdateRoleRequest = {
        description: this.form.description || undefined
      };

      this.roleService.updateRole(roleId, request)
        .pipe(
          catchError(err => {
            const errMsg = err.error?.message || 'Error al actualizar rol';
            this.toast.add({ severity: 'error', summary: 'Error', detail: errMsg });
            this.submitting.set(false);
            return of(null);
          })
        )
        .subscribe(res => {
          if (res?.data) {
            this.toast.add({ severity: 'success', summary: 'Éxito', detail: 'Rol actualizado correctamente' });
            this.showFormDialog = false;
            this.loadRoles();
          }
        });
    } else {
      const request: CreateRoleRequest = {
        name: this.form.name,
        description: this.form.description || undefined
      };

      this.roleService.createRole(request)
        .pipe(
          catchError(err => {
            const errMsg = err.error?.message || 'Error al crear rol';
            this.toast.add({ severity: 'error', summary: 'Error', detail: errMsg });
            this.submitting.set(false);
            return of(null);
          })
        )
        .subscribe(res => {
          if (res?.data) {
            this.toast.add({ severity: 'success', summary: 'Éxito', detail: 'Rol creado correctamente' });
            this.showFormDialog = false;
            this.loadRoles();
          }
        });
    }
  }

  deleteRole(role: Role): void {
    this.confirmationService.confirm({
      message: `¿Estás seguro de que deseas eliminar el rol ${role.name}?`,
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonProps: {
        severity: 'danger',
        label: 'Eliminar'
      },
      rejectButtonProps: {
        severity: 'secondary',
        outlined: true,
        label: 'Cancelar'
      },
      accept: () => {
        this.roleService.deleteRole(role.id)
          .pipe(
            catchError(err => {
              const errMsg = err.error?.message || 'Error al eliminar rol';
              this.toast.add({ severity: 'error', summary: 'Error', detail: errMsg });
              return of(null);
            })
          )
          .subscribe(res => {
            if (res) {
              this.toast.add({ severity: 'success', summary: 'Éxito', detail: 'Rol eliminado correctamente' });
              this.loadRoles();
            }
          });
      }
    });
  }

  openPermissionsDialog(role: Role): void {
    this.selectedRole.set(role);
    this.selectedPermissionIds.set(new Set<string>());
    this.showPermissionsDialog = true;

    this.roleService.getRolePermissions(role.id)
      .pipe(
        catchError(() => {
          this.toast.add({ severity: 'error', summary: 'Error', detail: 'Error al obtener permisos del rol' });
          return of({ data: [] });
        })
      )
      .subscribe(res => {
        const ids = new Set<string>((res.data || []).map(p => p.id));
        this.selectedPermissionIds.set(ids);
      });
  }

  hidePermissionsDialog(): void {
    this.showPermissionsDialog = false;
    this.selectedRole.set(null);
  }

  isPermissionChecked(permissionId: string): boolean {
    return this.selectedPermissionIds().has(permissionId);
  }

  togglePermission(permissionId: string): void {
    const current = new Set<string>(this.selectedPermissionIds());
    if (current.has(permissionId)) {
      current.delete(permissionId);
    } else {
      current.add(permissionId);
    }
    this.selectedPermissionIds.set(current);
  }

  saveRolePermissions(): void {
    const role = this.selectedRole();
    if (!role) return;

    this.submittingPermissions.set(true);
    const permissionIds = Array.from(this.selectedPermissionIds());

    this.roleService.assignRolePermissions(role.id, permissionIds)
      .pipe(
        catchError(err => {
          const errMsg = err.error?.message || 'Error al guardar permisos';
          this.toast.add({ severity: 'error', summary: 'Error', detail: errMsg });
          this.submittingPermissions.set(false);
          return of(null);
        })
      )
      .subscribe(res => {
        if (res) {
          this.toast.add({ severity: 'success', summary: 'Éxito', detail: 'Permisos del rol actualizados correctamente' });
          this.showPermissionsDialog = false;
          this.submittingPermissions.set(false);
          this.loadRoles();
        }
      });
  }
}
