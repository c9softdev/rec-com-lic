export interface LoginRequest {
  event: string;
  mode: string;
  InputData: Array<{
    Username: string;
    Password?: string;
  }>;
}

export interface LoginResponse {
  archivalchk: any;
  viewresumechk: any;
  printresumechk: any;
  editresumechk: any;
  assignmenuIdStr: any;
  chrType: any;
  EmailId: any;
  userName: string;
  userId: string;
  status: string;
  message: string;
  data?: Array<{
    EmailId: any;
    userId: string;
    userName?: string;
    empType?: string;
    login_IP?: string;
    login_IP2?: string;
    email?: string;
    password?: string;
    archivalchk: any;
    viewresumechk: any;
    printresumechk: any;
    assignmenuIdStr: any;
    editresumechk: any;
  }>;
}

export interface User {
  username: string;
  userId: string;
  empType: string;
  emailId?: string;  // Added for backward compatibility
  email?: string;
  archivalchk: any;
  viewresumechk: any;
  printresumechk: any;
  assignmenuIdStr: any;
  editresumechk: any;
  deleteOption?: any;
  optionN1?: any;
  optionN2?: any;
  // Add other user properties as needed
}