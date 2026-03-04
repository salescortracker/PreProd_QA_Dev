import { Component, OnInit, HostListener } from '@angular/core';
import { EmployeeForm } from '../../../../admin/layout/models/employee-forms.model';
import Swal from 'sweetalert2';
import { AdminService } from '../../../../admin/servies/admin.service';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-employee-forms',
  standalone: false,
  templateUrl: './employee-forms.component.html',
  styleUrls: ['./employee-forms.component.css']
})
export class EmployeeFormsComponent implements OnInit {
  // ---------- DATA LIST ----------
  formsList: EmployeeForm[] = [];

  // -------- FORM BINDING VARIABLES --------
  documentTypeId: number | string = "";
  documentName: string = "";
  issuedDate: string = "";
  remarks: string = "";
  confidential: boolean = false;
  fileName: string = "";
  
  selectedFile: File | null = null;

  // EDIT MODE
  isEdit: boolean = false;
  editId: number | null = null;

  // Validation / UI helpers
  showValidation = false;
  fileError = '';
  dateError = '';
  isSubmitting = false;

  // Sorting
  sortColumn: keyof EmployeeForm | null = null;
  sortDirection: 'asc' | 'desc' = 'asc';

  userId!: number;
  companyId!: number;
  regionId!: number;

  // Pagination
  pageSize = 5;
  currentPage = 1;
  pageSizeOptions = [5, 10, 20, 50];

  // Search & confidentiality
  searchTerm: string = '';
  showConfidential: boolean = true;
  isAdmin = true;
  
  // Document types
  documentTypes: any[] = [];

  // Employee selection
  employees: any[] = [];
  selectedEmployees: { code: string; name: string }[] = [];
  showEmployeeDropdown = false;
  employeeSearchTerm = '';
  filteredEmployees: any[] = [];
  
  today: string = new Date().toISOString().split('T')[0];

  constructor(private adminService: AdminService) {}

  ngOnInit() {
    this.userId = Number(sessionStorage.getItem("UserId"));
    this.companyId = Number(sessionStorage.getItem("CompanyId"));
    this.regionId = Number(sessionStorage.getItem("RegionId"));
    this.loadDocumentTypes();
    this.loadEmployees();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.employee-selector-wrapper')) {
      this.showEmployeeDropdown = false;
    }
  }

  loadEmployees() {
    this.adminService.getEmployeesByCompanyAndRegion(this.companyId, this.regionId).subscribe({
      next: (res: any) => {
        this.employees = res.data || [];
        this.filteredEmployees = [...this.employees];
      },
      error: (err) => {
        console.error('Failed to load employees', err);
        this.employees = [];
        this.filteredEmployees = [];
      }
    });
  }

  loadDocumentTypes() {
    this.adminService.getActiveDocumentTypes().subscribe({
      next: (res: any) => {
        this.documentTypes = res;
        this.loadEmployeeForms();
      },
      error: (err) => {
        console.error('Failed to load document types', err);
      }
    });
  }

  loadEmployeeForms() {
    this.adminService.getEmployeeFormsByEmployeeId(this.userId).subscribe({
      next: (res: any) => {
        this.formsList = res.map((api: any) => {
          const typeObj = this.documentTypes.find(d => d.id == api.documentTypeId);
          return {
            id: api.id,
            type: typeObj ? typeObj.typeName : '',
            name: api.documentName,
            employee: `${api.employeeName} (${api.employeeCode})`, // Show name with code
            employeeCode: api.employeeCode,
            employeeName: api.employeeName,
            date: api.issueDate,
            remarks: api.remarks,
            confidential: api.isConfidential,
            fileName: api.fileName || api.uploadFileName || api.uploadFile || api.filePath || api.fileUrl || ''
          };
        });
        this.updatePagination();
      },
      error: (err) => console.error(err)
    });
  }

  // Employee selection methods
  toggleEmployeeDropdown() {
    this.showEmployeeDropdown = !this.showEmployeeDropdown;
    if (this.showEmployeeDropdown) {
      this.filterEmployees();
    }
  }

  closeEmployeeDropdown() {
    this.showEmployeeDropdown = false;
  }

  filterEmployees() {
    if (!this.employeeSearchTerm) {
      this.filteredEmployees = [...this.employees];
    } else {
      const term = this.employeeSearchTerm.toLowerCase();
      this.filteredEmployees = this.employees.filter(emp =>
        emp.employeeCode.toLowerCase().includes(term) ||
        emp.employeeName.toLowerCase().includes(term)
      );
    }
  }

isEmployeeSelected(code: string): boolean {
  return this.selectedEmployees.some(e => e.code === code);
}

  isAllEmployeesSelected(): boolean {
    return this.selectedEmployees.length === this.employees.length && this.employees.length > 0;
  }

  toggleAllEmployees(event: any) {
    if (event.target.checked) {
      this.selectedEmployees = this.employees.map(emp => ({
        code: emp.employeeCode,
        name: emp.employeeName
      }));
    } else {
      this.selectedEmployees = [];
    }
  }

  toggleEmployee(emp: any) {
    const index = this.selectedEmployees.findIndex(e => e.code === emp.employeeCode);
    if (index === -1) {
      this.selectedEmployees.push({
        code: emp.employeeCode,
        name: emp.employeeName
      });
    } else {
      this.selectedEmployees.splice(index, 1);
    }
  }

  applyEmployeeSelection() {
    this.showEmployeeDropdown = false;
  }

  getSelectedEmployeesDisplay(): string {
    if (this.selectedEmployees.length === 0) {
      return 'Select employees...';
    }
    if (this.selectedEmployees.length === 1) {
      return this.selectedEmployees[0].name;
    }
    return `${this.selectedEmployees.length} employees selected`;
  }

  // File upload
  onFileSelect(event: any) {
    this.fileError = '';
    const file: File = event.target.files?.[0];
    if (!file) return;
    
    const allowed = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'];
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    
    if (!allowed.includes(ext)) {
      this.selectedFile = null;
      this.fileName = '';
      this.fileError = 'Invalid file type. Allowed: PDF, DOC, DOCX, JPG, PNG';
      Swal.fire({ icon: 'error', title: 'Invalid File Type', text: this.fileError });
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      this.selectedFile = null;
      this.fileName = '';
      this.fileError = 'File too large. Max 5 MB';
      Swal.fire({ icon: 'error', title: 'File Too Large', text: this.fileError });
      return;
    }
    
    this.selectedFile = file;
    this.fileName = file.name;
  }

  viewDocument(path: string, download = false) {
    this.adminService.ViewDocument(environment.LettersPath + path, download);
  }

  // Submit form
  onSubmit() {
    this.showValidation = true;
    this.dateError = '';
    this.fileError = '';

    // Validation
    if (!this.documentTypeId || !this.documentName || this.selectedEmployees.length === 0 || !this.issuedDate) {
      Swal.fire({ 
        icon: 'warning', 
        title: 'Required fields missing', 
        text: 'Please fill all required fields.' 
      });
      return;
    }

    if (!this.selectedFile && !this.isEdit) {
      Swal.fire({ 
        icon: 'warning', 
        title: 'File required', 
        text: 'Please select a file to upload.' 
      });
      return;
    }

    this.isSubmitting = true;

    // Create records for each selected employee
    const savePromises = this.selectedEmployees.map(emp => {
      const formData = new FormData();
      
      if (this.editId) {
        formData.append("Id", this.editId.toString());
      }
      
      formData.append("DocumentTypeId", this.documentTypeId.toString());
      formData.append("DocumentName", this.documentName);
      formData.append("EmployeeCode", emp.code);
      formData.append("EmployeeName", emp.name);
      formData.append("IssueDate", this.issuedDate);
      formData.append("Remarks", this.remarks ?? "");
      formData.append("IsConfidential", this.confidential ? "true" : "false");
      formData.append("UserId", this.userId.toString());
      formData.append("CompanyId", this.companyId.toString());
      formData.append("RegionId", this.regionId.toString());

      if (this.selectedFile) {
        formData.append("UploadFile", this.selectedFile);
      }

      if (this.isEdit && this.editId) {
        return this.adminService.updateEmployeeForms(this.editId, formData).toPromise();
      } else {
        return this.adminService.addEmployeeForms(formData).toPromise();
      }
    });

    // Execute all saves
    Promise.all(savePromises)
      .then(() => {
        Swal.fire({ 
          icon: 'success', 
          title: this.isEdit ? 'Updated!' : 'Saved!', 
          text: `${savePromises.length} record(s) ${this.isEdit ? 'updated' : 'saved'} successfully.` 
        });
        this.loadEmployeeForms();
        this.resetFormInternal();
      })
      .catch(err => {
        console.error(err);
        Swal.fire({ 
          icon: 'error', 
          title: 'Error', 
          text: `Failed to ${this.isEdit ? 'update' : 'save'} records` 
        });
      })
      .finally(() => {
        this.isSubmitting = false;
      });
  }

  // Edit record
  editRecord(record: any) {
    this.isEdit = true;
    this.editId = record.id;

    const docType = this.documentTypes.find(d => d.typeName === record.type);
    this.documentTypeId = docType ? docType.id : '';
    this.documentName = record.name;
    this.issuedDate = record.date;
    this.remarks = record.remarks;
    this.confidential = record.confidential;
    this.fileName = record.fileName;

    // Set selected employee
    this.selectedEmployees = [{
      code: record.employeeCode,
      name: record.employeeName
    }];

    this.selectedFile = null;
    this.showValidation = false;

    Swal.fire({ 
      icon: 'info', 
      title: 'Edit Mode', 
      text: 'Form loaded for editing.',
      timer: 1500
    });
  }

  // Delete record
  deleteRecord(id: number) {
    Swal.fire({
      title: 'Are you sure you want to delete this record?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, Delete',
      cancelButtonText: 'Cancel'
    }).then(result => {
      if (result.isConfirmed) {
        this.adminService.deleteEmployeeForms(id).subscribe({
          next: () => {
            Swal.fire({ 
              icon: 'success', 
              title: 'Deleted!', 
              text: 'Record removed successfully.',
              timer: 1500
            });
            this.loadEmployeeForms();
            if (this.currentPage > this.totalPages) this.currentPage = this.totalPages;
          },
          error: (err) => {
            console.error(err);
            Swal.fire('Error', 'Failed to delete record', 'error');
          }
        });
      }
    });
  }

  // Reset form
  onReset() {
    Swal.fire({
      title: 'Reset form?',
      text: 'This will clear the form fields.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, reset',
      cancelButtonText: 'Cancel'
    }).then(res => {
      if (res.isConfirmed) {
        this.resetFormInternal();
        Swal.fire({ icon: 'success', title: 'Reset', text: 'Form cleared.', timer: 1500 });
      }
    });
  }

  private resetFormInternal() {
    this.documentTypeId = "";
    this.documentName = "";
    this.issuedDate = "";
    this.remarks = "";
    this.confidential = false;
    this.fileName = "";
    this.selectedFile = null;
    this.isEdit = false;
    this.editId = null;
    this.showValidation = false;
    this.fileError = '';
    this.dateError = '';
    this.selectedEmployees = [];
    this.employeeSearchTerm = '';
    this.showEmployeeDropdown = false;
  }

  // Sorting
  sortBy(column: keyof EmployeeForm) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
  }

  private getSorted(): EmployeeForm[] {
    let data = [...this.formsList];

    if (this.sortColumn) {
      data.sort((a, b) => {
        const valA = (String((a as any)[this.sortColumn!]) || '').toLowerCase();
        const valB = (String((b as any)[this.sortColumn!]) || '').toLowerCase();
        if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return this.sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return data;
  }

  // Filter + Pagination
  private filtered(): EmployeeForm[] {
    const term = this.searchTerm.trim().toLowerCase();

    let data = this.getSorted().filter(d => {
      if (!this.showConfidential && d.confidential) return false;
      if (!this.isAdmin && d.confidential) return false;

      if (!term) return true;
      return (d.name || '').toLowerCase().includes(term)
        || (d.type || '').toLowerCase().includes(term)
        || (d.employee || '').toLowerCase().includes(term);
    });

    return data;
  }

  pagedForms(): EmployeeForm[] {
    const data = this.filtered();
    const start = (this.currentPage - 1) * this.pageSize;
    return data.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filtered().length / this.pageSize));
  }

  changePage(page: number) {
    if (page >= 1 && page <= this.totalPages) this.currentPage = page;
  }

  changePageSize(size: number) {
    this.pageSize = size;
    this.currentPage = 1;
  }

  onSearch() {
    this.currentPage = 1;
  }

  toggleConfidential() {
    this.showConfidential = !this.showConfidential;
    this.currentPage = 1;
  }

  updatePagination() {
    this.currentPage = 1;
  }

  // Helpers
  formatDate(dateStr?: string) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const dd = ('0' + d.getDate()).slice(-2);
    const mm = ('0' + (d.getMonth() + 1)).slice(-2);
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  onDateChange() {
    this.dateError = '';
    const today = new Date().toISOString().split('T')[0];
    if (this.issuedDate && this.issuedDate > today) {
      this.dateError = 'Issued date cannot be a future date.';
    }
  }
}