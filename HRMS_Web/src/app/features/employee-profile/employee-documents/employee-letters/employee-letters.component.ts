import { Component, OnInit, HostListener, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { EmployeeLetter } from '../../../../admin/layout/models/employee-letter.model';
import Swal from 'sweetalert2';
import { AdminService } from '../../../../admin/servies/admin.service';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-employee-letters',
  standalone: false,
  templateUrl: './employee-letters.component.html',
  styleUrls: ['./employee-letters.component.css']
})
export class EmployeeLettersComponent implements OnInit {
  @ViewChild('letterForm') letterForm!: NgForm;
  
  sortColumn: keyof EmployeeLetter | null = null;
  sortDirection: 'asc' | 'desc' = 'asc';
  today: string = new Date().toISOString().split('T')[0];

  userId!: number;
  companyId!: number;
  regionId!: number;

  // Pagination
  pageSize = 5;
  currentPage = 1;
  pageSizeOptions = [5, 10, 20, 50];

  letters: EmployeeLetter[] = [];

  // File
  selectedFile: File | null = null;
  employees: any[] = [];

  // Form model
  form: any = {
    id: 0,
    documentType: '',
    title: '',
    empCode: '',
    empName: '',
    issuedDate: '',
    validityDate: '',
    fileName: '',
    remarks: '',
    confidential: false
  };
  
  isEdit: boolean = false;
  documentTypes: any[] = [];

  // Multi-select properties
  selectedEmployees: { code: string; name: string }[] = [];
  showEmployeeDropdown = false;
  employeeSearchTerm = '';
  filteredEmployees: any[] = [];
  employeeDropdownTouched = false;

  constructor(private adminService: AdminService) {}

  ngOnInit() {
    this.loadDocumentTypes();
    this.userId = Number(sessionStorage.getItem("UserId"));
    this.companyId = Number(sessionStorage.getItem("CompanyId"));
    this.regionId = Number(sessionStorage.getItem("RegionId"));
    this.loadEmployees();
    this.loadEmployeeLetters();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.employee-selector-wrapper')) {
      this.showEmployeeDropdown = false;
    }
  }

  loadEmployees() {
    this.adminService
      .getEmployeesByCompanyAndRegion(this.companyId, this.regionId)
      .subscribe({
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

  loadEmployeeLetters() {
    this.adminService.getEmployeeLettersByEmployeeId(this.userId).subscribe({
      next: (res: any) => {
        this.letters = res.map((x: any) => ({
          id: x.id,
          documentType: this.getDocumentTypeName(x.documentTypeId),
          title: x.documentName,
          empCode: x.employeeCode,
          empName: x.employeeName,
          issuedDate: x.issuedDate,
          validityDate: x.validityDate,
          fileName: x.fileName,
          remarks: x.remarks,
          confidential: x.isConfidential
        }));
        this.updatePagination();
      },
      error: (err) => console.error(err)
    });
  }

  viewDocument(path: string, download = false) {
    this.adminService.ViewDocument(environment.LettersPath + path, download);
  }

  getDocumentTypeName(id: number): string {
    const doc = this.documentTypes.find(d => d.id === id);
    return doc ? doc.typeName : '';
  }

  loadDocumentTypes() {
    this.adminService.getActiveDocumentTypes().subscribe({
      next: (res: any) => {
        this.documentTypes = res;
        this.loadEmployeeLetters();
      },
      error: (err) => {
        console.error('Failed to load document types', err);
      }
    });
  }

  // Sorting
  sortBy(column: keyof EmployeeLetter) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
  }

  getSortedLetters(): EmployeeLetter[] {
    let data = [...this.letters];

    if (this.sortColumn) {
      data.sort((a, b) => {
        const valA = a[this.sortColumn!] ?? '';
        const valB = b[this.sortColumn!] ?? '';

        if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return this.sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return data;
  }

  filteredLetters(): EmployeeLetter[] {
    let data = this.getSortedLetters();
    const start = (this.currentPage - 1) * this.pageSize;
    return data.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.letters.length / this.pageSize);
  }

  changePage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  changePageSize(size: number) {
    this.pageSize = size;
    this.currentPage = 1;
  }

  updatePagination() {
    this.currentPage = 1;
  }

  // Employee selection methods
  toggleEmployeeDropdown() {
    this.showEmployeeDropdown = !this.showEmployeeDropdown;
    this.employeeDropdownTouched = true;
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
    return this.selectedEmployees.some(emp => emp.code === code);
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
      const emp = this.selectedEmployees[0];
      return `${emp.code} - ${emp.name}`;
    }
    return `${this.selectedEmployees.length} employees selected`;
  }

  // File validation
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    const allowed = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'];
    const ext = file.name.split('.').pop().toLowerCase();

    if (!allowed.includes(ext)) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid File Type',
        text: 'Allowed formats: PDF, DOC, DOCX, JPG, PNG'
      });
      this.selectedFile = null;
      event.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      Swal.fire({
        icon: 'error',
        title: 'File Too Large',
        text: 'Maximum file size is 5 MB.'
      });
      this.selectedFile = null;
      event.target.value = '';
      return;
    }

    this.selectedFile = file;
    this.form.fileName = file.name;
  }

  // Save letter for multiple employees
  async saveLetter(form: NgForm) {
    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }

    if (this.selectedEmployees.length === 0) {
      this.employeeDropdownTouched = true;
      Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: 'Please select at least one employee'
      });
      return;
    }

    if (!this.selectedFile && !this.isEdit) {
      Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: 'Please select a file'
      });
      return;
    }

    // Validate dates
    if (this.form.validityDate && new Date(this.form.validityDate) < new Date(this.form.issuedDate)) {
      Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: 'Validity date must be on or after issued date'
      });
      return;
    }

    const savePromises = this.selectedEmployees.map(emp => {
      const formData = new FormData();
      formData.append("Id", String(this.form.id));
      formData.append("DocumentTypeId", String(this.form.documentType));
      formData.append("DocumentName", this.form.title);
      formData.append("EmployeeCode", emp.code);
      formData.append("EmployeeName", emp.name);
      formData.append("IssuedDate", this.form.issuedDate);
      formData.append("ValidityDate", this.form.validityDate || "");
      formData.append("Remarks", this.form.remarks || "");
      formData.append("IsConfidential", String(this.form.confidential));
      formData.append("UserId", String(this.userId));
      formData.append("CompanyId", String(this.companyId));
      formData.append("RegionId", String(this.regionId));

      if (this.selectedFile) {
        formData.append("DocumentFile", this.selectedFile);
      }

      if (this.isEdit) {
        return this.adminService.updateEmployeeLetter(this.form.id, formData).toPromise();
      } else {
        return this.adminService.addEmployeeLetter(formData).toPromise();
      }
    });

    try {
      const loadingAlert = Swal.fire({
        title: 'Saving...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      await Promise.all(savePromises);
      
      
      
      Swal.fire({
        icon: 'success',
        title: this.isEdit ? 'Updated!' : 'Saved!',
        text: `${savePromises.length} letter(s) ${this.isEdit ? 'updated' : 'saved'} successfully!`,
        timer: 2000
      });
      
      this.loadEmployeeLetters();
      this.resetFormFields();
    } catch (err: any) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.error?.message || `Failed to ${this.isEdit ? 'update' : 'save'} letters`
      });
    }
  }

  // Edit letter
  editLetter(item: any) {
    this.form = {
      id: item.id,
      documentType: item.documentType,
      title: item.title,
      empCode: item.empCode,
      empName: item.empName,
      issuedDate: item.issuedDate,
      validityDate: item.validityDate,
      fileName: item.fileName,
      remarks: item.remarks,
      confidential: item.confidential
    };
    
    this.selectedEmployees = [{
      code: item.empCode,
      name: item.empName
    }];
    
    this.isEdit = true;
    this.selectedFile = null;
    this.employeeDropdownTouched = false;
  }

  // Delete letter
  deleteLetter(id: number) {
    Swal.fire({
      title: 'Are you sure?',
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, Delete',
      cancelButtonText: 'Cancel'
    }).then(result => {
      if (result.isConfirmed) {
        this.adminService.deleteEmployeeLetter(id).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: 'Deleted!',
              text: 'Letter deleted successfully.',
              timer: 1500
            });
            this.loadEmployeeLetters();
          },
          error: (err) => {
            console.error(err);
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: 'Failed to delete letter'
            });
          }
        });
      }
    });
  }

  // Reset form
  resetFormFields() {
    this.form = {
      id: 0,
      documentType: '',
      title: '',
      empCode: '',
      empName: '',
      issuedDate: '',
      validityDate: '',
      fileName: '',
      remarks: '',
      confidential: false
    };
    this.selectedEmployees = [];
    this.selectedFile = null;
    this.isEdit = false;
    this.employeeDropdownTouched = false;
    this.showEmployeeDropdown = false;
    this.employeeSearchTerm = '';
    
    // Reset the form validation state
    if (this.letterForm) {
      this.letterForm.resetForm();
    }
  }
}