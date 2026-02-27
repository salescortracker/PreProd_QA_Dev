import { Component, OnInit } from '@angular/core';
import { AdminService } from '../../../admin/servies/admin.service';
interface NewsItem {
  Title: string;
  Category: string;
  Description: string;
  Date: Date;
}
@Component({
  selector: 'app-comany-news',
  standalone: false,
  templateUrl: './comany-news.component.html',
  styleUrl: './comany-news.component.css'
})
export class ComanyNewsComponent {
 // Array to store all news
 newsList: NewsItem[] = []; // filtered news
  categories: string[] = [];

  searchCategory: string = '';
  searchDate: string = '';

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.loadCategories(); // load categories dynamically
    // Do NOT load news initially!
  }

  // Load categories dynamically from departments table
  loadCategories() {
    this.adminService.getallDepartments().subscribe({
      next: (res) => {
        this.categories = Array.from(
          new Set(res.filter(d => d.isActive && d.description).map(d => d.description!))
        );
      },
      error: (err) => console.error('Error fetching categories', err)
    });
  }

  // Load filtered news from backend based on selected category & date
  loadFilteredNews() {
    if (!this.searchCategory && !this.searchDate) {
      this.newsList = [];
      return; // do nothing if no filter selected
    }

    const category = this.searchCategory || undefined;
    const date = this.searchDate || undefined;

    this.adminService.getFilteredNews(category, date).subscribe({
      next: (res: any[]) => {
        this.newsList = res.map(n => ({
          Title: n.title,
          Category: n.category,
          Description: n.description,
          Date: n.displayDate ? new Date(n.displayDate) : new Date()
        }));
      },
      error: (err) => console.error('Error fetching filtered news', err)
    });
  }
}
