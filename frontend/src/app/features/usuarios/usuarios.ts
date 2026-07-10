import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { UserService, CreateUserRequest, UpdateUserRequest } from '../../core/services/user.service';
import { RoleService } from '../../core/services/role.service';
import { User, Role } from '../../core/interfaces/user';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    IconFieldModule,
    InputIconModule,
    MessageModule,
    ToastModule,
    ConfirmDialogModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './usuarios.html',
  styleUrl: './usuarios.scss'
})
export class Usuarios implements OnInit {
  private userService = inject(UserService);
  private roleService = inject(RoleService);
  private toast = inject(MessageService);
  private confirmationService = inject(ConfirmationService);

  users = signal<User[]>([]);
  roles = signal<Role[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  submitting = signal(false);
  total = signal(0);
  page = 1;
  limit = 10;
  sortBy = signal('createdAt');
  sortOrder = signal<'asc' | 'desc'>('desc');
  search = signal('');
  roleFilter = signal<string | undefined>(undefined);
  statusFilter = signal<boolean | undefined>(undefined);

  showFormDialog = false;
  isEditMode = false;
  selectedUserId: string | null = null;

  form = {
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    roleId: '',
    isActive: true
  };

  statusFilterOptions = [
    { label: 'Todos', value: undefined },
    { label: 'Activos', value: true },
    { label: 'Inactivos', value: false }
  ];

  roleOptions = computed(() => {
    return [
      { label: 'Todos los Roles', value: undefined },
      ...this.roles().map(r => ({ label: r.name, value: r.id }))
    ];
  });

  get roleSelectOptions(): Role[] {
    return this.roles();
  }

  ngOnInit(): void {
    this.loadRoles();
    this.loadUsers();
  }

  loadRoles(): void {
    this.roleService.getRoles()
      .pipe(
        catchError(() => {
          this.toast.add({ severity: 'error', summary: 'Error', detail: 'Error al cargar roles' });
          return of({ success: false, data: [] });
        })
      )
      .subscribe(res => {
        this.roles.set(res.data || []);
      });
  }

  loadUsers(): void {
    this.loading.set(true);
    this.error.set(null);

    const params = {
      page: this.page,
      limit: this.limit,
      sortBy: this.sortBy(),
      sortOrder: this.sortOrder(),
    };

    if (this.search()) Object.assign(params, { search: this.search() });
    if (this.roleFilter()) Object.assign(params, { roleId: this.roleFilter() });
    if (this.statusFilter() !== undefined) Object.assign(params, { isActive: this.statusFilter() });

    this.userService.getUsers(params)
      .pipe(
        catchError(err => {
          const errMsg = err.error?.message || 'Error al cargar usuarios';
          this.error.set(errMsg);
          this.toast.add({ severity: 'error', summary: 'Error', detail: errMsg });
          return of({ data: [], meta: { total: 0 } });
        })
      )
      .subscribe(res => {
        this.users.set(res.data);
        this.total.set(res.meta?.total ?? 0);
        this.loading.set(false);
      });
  }

  onPageChange(event: any): void {
    this.page = (event.first / event.rows) + 1;
    this.limit = event.rows;
    this.loadUsers();
  }

  onSort(event: any): void {
    if (event.sortField) {
      this.sortBy.set(event.sortField);
      this.sortOrder.set(event.sortOrder === 1 ? 'asc' : 'desc');
      this.loadUsers();
    }
  }

  openCreateDialog(): void {
    this.isEditMode = false;
    this.selectedUserId = null;
    this.form = {
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      phone: '',
      roleId: this.roles()[0]?.id || '',
      isActive: true
    };
    this.showFormDialog = true;
  }

  openEditDialog(user: User): void {
    this.isEditMode = true;
    this.selectedUserId = user.id;
    this.form = {
      email: user.email,
      password: '',
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone || '',
      roleId: user.roleId,
      isActive: user.isActive
    };
    this.showFormDialog = true;
  }

  hideDialog(): void {
    this.showFormDialog = false;
    this.submitting.set(false);
  }

  saveUser(): void {
    if (!this.form.firstName || !this.form.lastName || !this.form.email || !this.form.roleId) {
      return;
    }

    if (!this.isEditMode && (!this.form.password || this.form.password.length < 6)) {
      return;
    }

    this.submitting.set(true);

    if (this.isEditMode && this.selectedUserId) {
      const request: UpdateUserRequest = {
        email: this.form.email,
        firstName: this.form.firstName,
        lastName: this.form.lastName,
        phone: this.form.phone || undefined,
        roleId: this.form.roleId,
        isActive: this.form.isActive
      };

      this.userService.updateUser(this.selectedUserId, request)
        .pipe(
          catchError(err => {
            const errMsg = err.error?.message || 'Error al actualizar usuario';
            this.toast.add({ severity: 'error', summary: 'Error', detail: errMsg });
            this.submitting.set(false);
            return of(null);
          })
        )
        .subscribe(user => {
          if (user) {
            this.toast.add({ severity: 'success', summary: 'Éxito', detail: 'Usuario actualizado correctamente' });
            this.showFormDialog = false;
            this.loadUsers();
          }
        });
    } else {
      const request: CreateUserRequest = {
        email: this.form.email,
        password: this.form.password,
        firstName: this.form.firstName,
        lastName: this.form.lastName,
        phone: this.form.phone || undefined,
        roleId: this.form.roleId,
        isActive: this.form.isActive
      };

      this.userService.createUser(request)
        .pipe(
          catchError(err => {
            const errMsg = err.error?.message || 'Error al crear usuario';
            this.toast.add({ severity: 'error', summary: 'Error', detail: errMsg });
            this.submitting.set(false);
            return of(null);
          })
        )
        .subscribe(user => {
          if (user) {
            this.toast.add({ severity: 'success', summary: 'Éxito', detail: 'Usuario creado correctamente' });
            this.showFormDialog = false;
            this.loadUsers();
          }
        });
    }
  }

  deleteUser(user: User): void {
    this.confirmationService.confirm({
      message: `¿Estás seguro de que deseas eliminar al usuario ${user.firstName} ${user.lastName}?`,
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
        this.userService.deleteUser(user.id)
          .pipe(
            catchError(err => {
              const errMsg = err.error?.message || 'Error al eliminar usuario';
              this.toast.add({ severity: 'error', summary: 'Error', detail: errMsg });
              return of(false);
            })
          )
          .subscribe(success => {
            if (success !== false) {
              this.toast.add({ severity: 'success', summary: 'Éxito', detail: 'Usuario eliminado correctamente' });
              this.loadUsers();
            }
          });
      }
    });
  }
}
