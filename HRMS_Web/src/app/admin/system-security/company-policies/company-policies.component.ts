import { Component, OnInit } from '@angular/core';
import Swal from 'sweetalert2';
import { AdminService,CompanyPolicy,PolicyCategory } from '../../servies/admin.service';

interface Policy {
  Title: string;
  Category: string;
  EffectiveDate: Date;
  Description?: string;
  FileName?: string;
  FileUrl?: string;
}
@Component({
  selector: 'app-company-policies',
  standalone: false,
  templateUrl: './company-policies.component.html',
  styleUrl: './company-policies.component.css'
})
export class CompanyPoliciesComponent {
  categories: PolicyCategory[] = [];
  policies: CompanyPolicy[] = [];
  policy: CompanyPolicy = this.resetPolicy();

  isEditMode: boolean = false;
   userId!: number;
  companyId!: number;
  regionId!: number;

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
     this.userId = Number(sessionStorage.getItem("UserId"));
  this.companyId = Number(sessionStorage.getItem("CompanyId"));
  this.regionId = Number(sessionStorage.getItem("RegionId"));

  if (!this.userId) {
    console.error("UserId missing in sessionStorage");
    return;
  }

    this.loadCategoriesAndPolicies();
  }

  resetPolicy(): CompanyPolicy {
    return {
      PolicyId: 0,
      CompanyId: 0,
      RegionId: 0,
      Title: '',
      CategoryId: 0,
      CategoryName: '',
      EffectiveDate: new Date().toISOString().split('T')[0],
      Description: '',
      File: null,
      FileName: '',
      FilePath: ''
    };
  }

loadCategoriesAndPolicies() {
  this.companyId = Number(sessionStorage.getItem("CompanyId"));
  this.regionId = Number(sessionStorage.getItem("RegionId"));
  this.adminService.getPolicyCategoryDropdown(this.companyId, this.regionId).subscribe({
    next: res => {
      this.categories = res; // now real categories
      this.adminService.getAllPolicies().subscribe({
        next: pols => {
          this.policies = pols.map(p => ({
            ...p,
            CategoryName: p.CategoryName || this.getCategoryName(p.CategoryId)
          }));
        },
        error: err => Swal.fire('Error', 'Failed to load policies', 'error')
      });
    },
    error: err => Swal.fire('Error', 'Failed to load categories', 'error')
  });
}

  // Helper to get category name by ID
  getCategoryName(catId: number): string {
    const cat = this.categories.find(c => c.PolicyCategoryID === catId);
    return cat ? cat.PolicyCategoryName : '';
  }

  onFileChange(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.policy.File = file;
      this.policy.FileName = file.name;
    }
  }

  onSubmit() {
    if (!this.policy.CategoryId || this.policy.CategoryId === 0) {
      Swal.fire('Validation', 'Please select a category', 'warning');
      return;
    }

    const formData = new FormData();
    formData.append('PolicyId', this.policy.PolicyId.toString());
    formData.append('CompanyId', this.policy.CompanyId.toString());
    formData.append('RegionId', this.policy.RegionId.toString());
    formData.append('Title', this.policy.Title);
    formData.append('CategoryId', this.policy.CategoryId.toString());
    formData.append('CategoryName', this.getCategoryName(this.policy.CategoryId));
    formData.append('EffectiveDate', this.policy.EffectiveDate);
    formData.append('Description', this.policy.Description || '');
    if (this.policy.File) formData.append('File', this.policy.File, this.policy.FileName);

    if (this.isEditMode) {
      this.adminService.updatePolicy(formData).subscribe({
        next: () => {
          Swal.fire('Updated', 'Policy updated successfully', 'success');
          this.resetForm();
          this.loadCategoriesAndPolicies();
        },
        error: () => Swal.fire('Error', 'Failed to update policy', 'error')
      });
    } else {
      this.adminService.createPolicy(formData).subscribe({
        next: () => {
          Swal.fire('Added', 'Policy added successfully', 'success');
          this.resetForm();
          this.loadCategoriesAndPolicies();
        },
        error: () => Swal.fire('Error', 'Failed to add policy', 'error')
      });
    }
  }

  editPolicy(p: CompanyPolicy) {
    this.isEditMode = true;
    this.policy = { ...p };
    this.policy.EffectiveDate = new Date(p.EffectiveDate).toISOString().split('T')[0];
  }

  deletePolicy(p: CompanyPolicy) {
    Swal.fire({
      title: 'Confirm Delete',
      text: `Are you sure you want to delete policy "${p.Title}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete'
    }).then(result => {
      if (result.isConfirmed) {
        this.adminService.deletePolicy(p.PolicyId).subscribe({
          next: () => {
            Swal.fire('Deleted', 'Policy deleted successfully', 'success');
            this.loadCategoriesAndPolicies();
          },
          error: () => Swal.fire('Error', 'Failed to delete policy', 'error')
        });
      }
    });
  }

  resetForm() {
    this.policy = this.resetPolicy();
    this.isEditMode = false;
  }
}
