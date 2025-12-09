// Main API export - maintains backward compatibility
// All API functions are organized in separate files but exported from here
// This ensures existing code continues to work without changes

import * as auth from './auth';
import * as users from './users';
import * as settings from './settings';
import * as students from './students';
import * as schedule from './schedule';
import * as records from './records';
import * as chat from './chat';
import * as logs from './logs';
import * as data from './data';
import * as subjects from './subjects';
import * as files from './files';

// Export all functions as a single api object (backward compatible)
export const api = {
  // Auth functions
  getCurrentUser: auth.getCurrentUser,
  signIn: auth.signIn,
  signUp: auth.signUp,
  signOut: auth.signOut,
  login: auth.login,
  resetUserPassword: auth.resetUserPassword,

  // User management
  getUsers: users.getUsers,
  updateUserProfile: users.updateUserProfile,
  updateUsers: users.updateUsers,
  deleteUser: users.deleteUser,
  checkEmailExists: users.checkEmailExists,
  checkUsernameExists: users.checkUsernameExists,

  // Settings
  registerSchool: settings.registerSchool,
  getSettings: settings.getSettings,
  updateSettings: settings.updateSettings,

  // Students
  getStudents: students.getStudents,
  addStudent: students.addStudent,
  importStudents: students.importStudents,
  updateStudent: students.updateStudent,
  deleteStudent: students.deleteStudent,
  updateStudentChallenge: students.updateStudentChallenge,

  // Schedule
  getSchedule: schedule.getSchedule,
  updateSchedule: schedule.updateSchedule,
  getSubstitutions: schedule.getSubstitutions,
  assignSubstitute: schedule.assignSubstitute,

  // Daily records
  getDailyRecords: records.getDailyRecords,
  saveDailyRecords: records.saveDailyRecords,
  getCompletedSessions: records.getCompletedSessions,
  markSessionComplete: records.markSessionComplete,

  // Chat
  getMessages: chat.getMessages,
  sendMessage: chat.sendMessage,

  // Logs
  getLogs: logs.getLogs,
  addLog: logs.addLog,

  // Data management
  deleteAllData: data.deleteAllData,
  deleteAllStudents: data.deleteAllStudents,
  deleteAllSchedule: data.deleteAllSchedule,
  deleteAllDailyRecords: data.deleteAllDailyRecords,
  deleteAllChatMessages: data.deleteAllChatMessages,
  deleteAllLogs: data.deleteAllLogs,
  deleteAllCompletedSessions: data.deleteAllCompletedSessions,
  deleteAllSubstitutions: data.deleteAllSubstitutions,

  // Subjects management
  getSubjects: subjects.getSubjects,
  addSubject: subjects.addSubject,
  updateSubject: subjects.updateSubject,
  deleteSubject: subjects.deleteSubject,

  // Files management
  getFiles: files.getFiles,
  uploadFile: files.uploadFile,
  updateFile: files.updateFile,
  deleteFile: files.deleteFile
};

// Also export individual modules for direct imports if needed
export { auth, users, settings, students, schedule, records, chat, logs, data, subjects, files };

