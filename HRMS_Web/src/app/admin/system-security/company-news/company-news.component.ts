import { Component } from '@angular/core';
import { AdminService,Department,News } from '../../servies/admin.service';
import { NgxSpinnerService } from 'ngx-spinner';
import Swal from 'sweetalert2';
@Component({
  selector: 'app-company-news',
  standalone: false,
  templateUrl: './company-news.component.html',
  styleUrl: './company-news.component.css'
})
export class CompanyNewsComponent {
   userId!: number;
  companyId!: number;
  regionId!: number;

  // Departments & Categories
  departments: Department[] = [];
  categories: string[] = [];

  // News
  newsList: News[] = [];
  news: News = this.resetNews();
  isEditMode: boolean = false;
  editIndex: number | null = null;

  // Filters
  searchText: string = '';
  searchCategory: string = '';
  startDate: string = '';
  endDate: string = '';

  constructor(private adminService: AdminService, private spinner: NgxSpinnerService) {}

  ngOnInit(): void {
    this.userId = Number(sessionStorage.getItem("UserId"));
    this.companyId = Number(sessionStorage.getItem("CompanyId"));
    this.regionId = Number(sessionStorage.getItem("RegionId"));
    if (!this.userId) return;

    this.loadDepartments();
    this.getNewsList();
  }

  // -----------------------------
  // Load Departments
  // -----------------------------
  loadDepartments() {
    this.spinner.show();
    this.adminService.getallDepartments().subscribe({
      next: (data) => {
        this.departments = data;
        this.categories = Array.from(
          new Set(data.filter(d => d.isActive && d.description).map(d => d.description!))
        );
        this.spinner.hide();
      },
      error: (err) => {
        console.error('Error loading departments', err);
        Swal.fire('Error', 'Failed to load departments', 'error');
        this.spinner.hide();
      }
    });
  }

  // -----------------------------
  // Load News
  // -----------------------------
  getNewsList() {
    this.spinner.show();
    this.adminService.getAllNews().subscribe({
      next: (res) => {
        this.newsList = res.map(item => ({
          NewsId: item.newsId,
          Title: item.title,
          Category: item.category,
          Description: item.description,
          Date: item.displayDate ? new Date(item.displayDate) : new Date(),
          PublishedDate: item.displayDate ? new Date(item.displayDate).toISOString().split('T')[0] : '',
          Attachment: null // file not returned by API
        }));
        this.spinner.hide();
      },
      error: (err) => {
        console.error('Error fetching news list', err);
        Swal.fire('Error', 'Failed to load news', 'error');
        this.spinner.hide();
      }
    });
  }

  // -----------------------------
  // Reset form
  // -----------------------------
  resetNews(): News {
    return {
      NewsId: undefined,
      Title: '',
      Category: '',
      Description: '',
      Date: new Date(),
      PublishedDate: '',
      Attachment: null
    };
  }

  resetForm() {
    this.news = this.resetNews();
    this.isEditMode = false;
    this.editIndex = null;
  }

  // -----------------------------
  // File Selection
  // -----------------------------
  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) this.news.Attachment = file;
  }

  // -----------------------------
  // Add / Update News
  // -----------------------------
  onSubmit() {
    debugger;
    if (!this.news.Title || !this.news.Category) {
      Swal.fire('Validation', 'Title and Category are required', 'warning');
      return;
    }

    const formData = new FormData();
    formData.append('Title', this.news.Title);
    formData.append('Category', this.news.Category);
    formData.append('Description', this.news.Description);

    if (this.news.Attachment) formData.append('UploadFile', this.news.Attachment);

    const displayDate = this.news.PublishedDate ? new Date(this.news.PublishedDate) : new Date();
    const formattedDate = this.formatDate(displayDate);

    formData.append('FromDate', formattedDate);
    formData.append('ToDate', formattedDate);
    formData.append('DisplayDate', displayDate.toISOString());
    formData.append('CompanyId', this.companyId.toString());
    formData.append('RegionId', this.regionId.toString());
    formData.append('CreatedBy', this.userId.toString());



    // ✅ Handle NewsId safely
    const newsId = this.news.NewsId ?? 0;
    formData.append('NewsId', newsId.toString());

    // UpdatedBy only for edit
    if (this.isEditMode) formData.append('UpdatedBy', this.userId.toString());

    this.spinner.show();
    const request$ = this.isEditMode
      ? this.adminService.updateNews(formData)
      : this.adminService.addNews(formData);

    request$.subscribe({
      next: (res) => {
        Swal.fire('Success', res, 'success');
        this.getNewsList();
        this.resetForm();
        this.spinner.hide();
      },
      error: (err) => {
        console.error('Error adding/updating news', err);
        Swal.fire('Error', 'Failed to add/update news', 'error');
        this.spinner.hide();
      }
    });
  }
  formatDate(date: Date): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = ('0' + (d.getMonth() + 1)).slice(-2);
  const day = ('0' + d.getDate()).slice(-2);
  return `${year}-${month}-${day}`;
}

  // -----------------------------
  // Edit News
  // -----------------------------
  editNews(n: News) {
    this.isEditMode = true;
    this.editIndex = this.newsList.indexOf(n);

    // ❗ Make sure NewsId exists and PublishedDate is string
    this.news = { ...n };
    this.news.PublishedDate = n.Date ? new Date(n.Date).toISOString().split('T')[0] : '';
  }

  // -----------------------------
  // Delete News
  // -----------------------------
  confirmDelete(n: News) {
    if (!n.NewsId) return;

    Swal.fire({
      title: 'Are you sure?',
      text: 'This will permanently delete the news',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it'
    }).then(result => {
      if (result.isConfirmed) {
        this.spinner.show();
        this.adminService.deleteNews(n.NewsId!, this.userId).subscribe({
          next: (res) => {
            Swal.fire('Deleted', 'News deleted successfully', 'success');
            this.getNewsList();
            this.spinner.hide();
          },
          error: (err) => {
            console.error('Error deleting news', err);
            Swal.fire('Error', 'Failed to delete news', 'error');
            this.spinner.hide();
          }
        });
      }
    });
  }

  // -----------------------------
  // Filtered News
  // -----------------------------
  filteredNews(): News[] {
    return this.newsList.filter(n => {
      const matchesText = n.Title.toLowerCase().includes(this.searchText.toLowerCase());
      const matchesCategory = this.searchCategory ? n.Category === this.searchCategory : true;
      const matchesStart = this.startDate ? new Date(n.Date) >= new Date(this.startDate) : true;
      const matchesEnd = this.endDate ? new Date(n.Date) <= new Date(this.endDate) : true;
      return matchesText && matchesCategory && matchesStart && matchesEnd;
    });
  }
}
