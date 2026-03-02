import { Component, ViewChild, ElementRef, OnInit } from '@angular/core';
import { TimesheetService } from '../../features/timesheet/service/timesheet.service';
import { AdminService } from '../../admin/servies/admin.service';
import { Router } from '@angular/router';

interface ChatMessage {
  sender: 'User' | 'Bot';
  text?: string;
  attachmentName?: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: false,
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {
  
  userId!: number;

  // ================= EMPLOYEE DATA =================
  totalEmployees = 0;
  fullTime = 0;
  partTime = 0;
  contract = 0;
  newEmployees = 0;

  // ================= TIMESHEET =================
  timesheets: any[] = [];

  // ================= HELPDESK =================
  helpdeskCategories: any[] = [];

  constructor(
    private router: Router,
    private timesheetService: TimesheetService,
    private adminService: AdminService
  ) {}

  ngOnInit(): void {
    this.userId = Number(sessionStorage.getItem("UserId"));
    this.loadPendingTimesheets();
    this.loadHelpdeskCategories();
    this.loadEmployeeStats();
  }

  // ================= EMPLOYEE STATS =================
  loadEmployeeStats() {
    this.adminService.getAllEmployees().subscribe((res: any[]) => {

      const employees = res || [];

      this.totalEmployees = employees.length;

      this.fullTime = employees.filter(e => e.type === 'Full-time').length;
      this.partTime = employees.filter(e => e.type === 'Part-time').length;
      this.contract = employees.filter(e => e.type === 'Contract').length;

      const currentMonth = new Date().getMonth();
      this.newEmployees = employees.filter(e =>
        new Date(e.joinDate).getMonth() === currentMonth
      ).length;

    });
  }

  // ================= TIMESHEET =================
  loadPendingTimesheets() {
    this.timesheetService.gettimesheetlisting(this.userId)
      .subscribe(res => {

        this.timesheets = (res || [])
          .filter((x: any) => x.status === 'Pending')
          .slice(0, 5);

      });
  }

  // ================= HELPDESK =================
  loadHelpdeskCategories() {
    this.adminService.getHelpdeskCategories(this.userId)
      .subscribe((res: any) => {

        const data = res?.data || [];
        this.helpdeskCategories = data.slice(0, 5);

      });
  }

  // ================= CHATBOT =================
  @ViewChild('fileInput') fileInput!: ElementRef;

  isOpen = false;
  showIntro = true;
  showModules = false;
  showEmojiPicker = false;
  userMessage = '';

  emojis: string[] = ['😀','😃','😄','😁','😆','😅','😂','🤣','😊','😉','😍','😘','😎','🤩','🤔','😐','😢','😭','😡','👍','🙏','👏','🔥','❤️'];

  modules = [
    'Leave','Attendance','Employee Profile','Help Desk',
    'Expenses','Timesheet','Recruitment','Company News',
    'Company Policies','Events','Assets','Compensation',
    'Performance','My Team','My Calendar'
  ];

  messages: ChatMessage[] = [
    {
      sender: 'Bot',
      text: '🤖 Hi! I am HRMS Assistant 😊'
    }
  ];

  toggleChat() {
    this.isOpen = !this.isOpen;
    this.showEmojiPicker = false;
  }

  openModules() {
    this.showIntro = false;
    this.showModules = true;
  }

  sendMessage() {
    const msg = this.userMessage.trim();
    if (!msg) return;

    this.messages.push({ sender: 'User', text: msg });

    this.messages.push({
      sender: 'Bot',
      text: '🤖 Please click View Modules to explore features.'
    });

    this.userMessage = '';
    this.showEmojiPicker = false;
  }

  toggleEmojiPicker() {
    this.showEmojiPicker = !this.showEmojiPicker;
  }

  addEmoji(emoji: string) {
    this.userMessage += emoji;
    this.showEmojiPicker = false;
  }

  triggerFileUpload() {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.messages.push({
        sender: 'User',
        attachmentName: file.name
      });
    }
  }
}
