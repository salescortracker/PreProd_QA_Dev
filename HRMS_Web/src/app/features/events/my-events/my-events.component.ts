import { Component } from '@angular/core';
import { AdminService } from '../../../admin/servies/admin.service';
@Component({
  selector: 'app-my-events',
  standalone: false,
  templateUrl: './my-events.component.html',
  styleUrl: './my-events.component.css'
})
export class MyEventsComponent {
 events: any[] = [];

 constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.loadEvents();
  }

loadEvents() {
    this.adminService.getEvents()
      .subscribe(res => this.events = res);
  }

}
