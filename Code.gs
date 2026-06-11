/**
 * AMOR - Aplikasi Monitoring Retur Backend
 * 
 * INSTRUCTIONS FOR USER:
 * 1. Go to your Google Sheet: https://docs.google.com/spreadsheets/d/1ln5gzZVo15tx-lmkZ5hDyGKeVbBQ6sVMqyWQKff0wFI/edit
 * 2. Click Extensions > Apps Script
 * 3. Delete existing code and paste all of this code into Code.gs
 * 4. Create 3 sheets in your spreadsheet named EXACTLY: "Users", "Transactions", "Progress"
 *    - In "Users" row 1: NIK | Password | Role | Name
 *    - In "Transactions" row 1: ID | Item | Current_Stage | Updated_At
 *    - In "Progress" row 1: Transaction_ID | Stage | Input_By | Date | Notes
 * 5. Click Deploy > New deployment
 * 6. Select type: "Web app"
 * 7. Execute as: "Me", Who has access: "Anyone"
 * 8. Click Deploy, Authorize access, and copy the Web App URL.
 * 9. Paste the URL into `src/services/api.js` replacing 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL'
 */

function doGet(e) {
  var action = e.parameter.action;
  
  if (action == 'login') {
    return handleLogin(e.parameter.nik, e.parameter.password);
  } else if (action == 'getTransactions') {
    return handleGetTransactions();
  } else if (action == 'getUsers') {
    return handleGetUsers();
  }
  
  return ContentService.createTextOutput(JSON.stringify({error: "Action not found"})).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action;
    
    if (action == 'addProgress') {
      return handleAddProgress(data);
    } else if (action == 'addUser') {
      return handleAddUser(data);
    } else if (action == 'updateUser') {
      return handleUpdateUser(data);
    } else if (action == 'deleteUser') {
      return handleDeleteUser(data);
    }
    
    return ContentService.createTextOutput(JSON.stringify({error: "Action not found"})).setMimeType(ContentService.MimeType.JSON);
  } catch(error) {
    return ContentService.createTextOutput(JSON.stringify({error: error.toString()})).setMimeType(ContentService.MimeType.JSON);
  }
}

function handleLogin(nik, password) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Users");
  var data = sheet.getDataRange().getValues();
  
  for (var i = 1; i < data.length; i++) {
    // Assuming col 0 is NIK, col 1 is Password
    if (data[i][0].toString() === nik && data[i][1].toString() === password) {
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        role: data[i][2],
        name: data[i][3]
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    success: false,
    message: "Invalid credentials"
  })).setMimeType(ContentService.MimeType.JSON);
}

function handleGetTransactions() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Transactions");
  var data = sheet.getDataRange().getValues();
  
  var progressSheet = ss.getSheetByName("Progress");
  var progressData = progressSheet.getDataRange().getValues();
  
  // Group progress by transaction ID
  // format: Transaction_ID | Stage | Input_By | Date | Notes
  var historyMap = {};
  for (var j = 1; j < progressData.length; j++) {
    var transId = progressData[j][0];
    var stage = progressData[j][1];
    var date = progressData[j][3];
    
    if (!historyMap[transId]) {
      historyMap[transId] = {};
    }
    historyMap[transId][stage] = date; // This stores the latest date for each stage
  }
  
  var result = [];
  for (var i = 1; i < data.length; i++) {
    var tid = data[i][0];
    result.push({
      id: tid,
      item: data[i][1],
      stage: data[i][2],
      updated: data[i][3],
      history: historyMap[tid] || {}
    });
  }
  
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

function handleAddProgress(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Record progress log
  var progressSheet = ss.getSheetByName("Progress");
  var dateNow = new Date().toISOString();
  progressSheet.appendRow([data.transactionId, data.stage, data.inputBy, dateNow, data.notes]);
  
  // 2. Update current stage in Transactions sheet
  var transSheet = ss.getSheetByName("Transactions");
  var transData = transSheet.getDataRange().getValues();
  
  for (var i = 1; i < transData.length; i++) {
    if (transData[i][0] === data.transactionId) {
      transSheet.getRange(i + 1, 3).setValue(data.stage); // Update stage
      transSheet.getRange(i + 1, 4).setValue(dateNow); // Update date
      break;
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({success: true})).setMimeType(ContentService.MimeType.JSON);
}

function handleAddUser(data) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Users");
  
  // Append new user to the Users sheet
  // Format: NIK | Password | Role | Name
  sheet.appendRow([data.nik, data.password, data.role, data.name]);
  
  return ContentService.createTextOutput(JSON.stringify({success: true})).setMimeType(ContentService.MimeType.JSON);
}

function handleGetUsers() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Users");
  var data = sheet.getDataRange().getValues();
  
  var users = [];
  // Skip header row
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    users.push({
      nik: row[0],
      // We purposefully DO NOT send the password (row[1]) back to the frontend for security!
      role: row[2],
      name: row[3]
    });
  }
  
  return ContentService.createTextOutput(JSON.stringify(users)).setMimeType(ContentService.MimeType.JSON);
}

function handleUpdateUser(data) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Users");
  var sheetData = sheet.getDataRange().getValues();
  
  for (var i = 1; i < sheetData.length; i++) {
    if (sheetData[i][0] == data.nik) {
      // Update Password if provided (column 2)
      if (data.password && data.password.trim() !== '') {
        sheet.getRange(i + 1, 2).setValue(data.password);
      }
      // Update Role (column 3)
      if (data.role) {
        sheet.getRange(i + 1, 3).setValue(data.role);
      }
      // Update Name (column 4)
      if (data.name) {
        sheet.getRange(i + 1, 4).setValue(data.name);
      }
      return ContentService.createTextOutput(JSON.stringify({success: true})).setMimeType(ContentService.MimeType.JSON);
    }
  }
  return ContentService.createTextOutput(JSON.stringify({error: "User not found"})).setMimeType(ContentService.MimeType.JSON);
}

function handleDeleteUser(data) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Users");
  var sheetData = sheet.getDataRange().getValues();
  
  for (var i = 1; i < sheetData.length; i++) {
    if (sheetData[i][0] == data.nik) {
      sheet.deleteRow(i + 1);
      return ContentService.createTextOutput(JSON.stringify({success: true})).setMimeType(ContentService.MimeType.JSON);
    }
  }
  return ContentService.createTextOutput(JSON.stringify({error: "User not found"})).setMimeType(ContentService.MimeType.JSON);
}
