function doGet(e) {
  var action = e.parameter.action;
  var callback = e.parameter.callback;
  
  var result;
  if (action === 'getOrders') {
    result = getOrders(e.parameter.date);
  } else if (action === 'getProducts') {
    result = getProducts();
  } else if (action === 'getTodaySummary') {
    result = getTodaySummary();
  } else {
    result = { success: false, message: 'Unknown action' };
  }
  
  var output = JSON.stringify(result);
  
  if (callback) {
    return ContentService.createTextOutput(callback + '(' + output + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  
  return ContentService.createTextOutput(output)
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action;
    var callback = e.parameter.callback;
    var result;
    
    if (action === 'syncOrders') {
      result = syncOrders(data.orders);
    } else if (action === 'syncProducts') {
      result = syncProducts(data.products);
    } else if (action === 'updateOrderStatus') {
      result = updateOrderStatus(data.orderId, data.newStatus);
    } else if (action === 'deleteOrder') {
      result = deleteOrder(data.orderId);
    } else if (action === 'test') {
      result = { success: true, message: 'Connection successful!' };
    } else {
      result = { success: false, message: 'Unknown action: ' + action };
    }
    
    var output = JSON.stringify(result);
    
    if (callback) {
      return ContentService.createTextOutput(callback + '(' + output + ');')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    
    return ContentService.createTextOutput(output)
      .setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    var errorResult = { success: false, message: error.toString() };
    var output = JSON.stringify(errorResult);
    
    if (e.parameter.callback) {
      return ContentService.createTextOutput(e.parameter.callback + '(' + output + ');')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    
    return ContentService.createTextOutput(output)
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function syncOrders(orders) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('orders');
  
  if (!orders || orders.length === 0) {
    return { success: true, message: 'No orders to sync' };
  }
  
  var existingData = sheet.getDataRange().getValues();
  var existingIds = {};
  for (var i = 1; i < existingData.length; i++) {
    existingIds[existingData[i][0]] = true;
  }
  
  var newRows = [];
  for (var j = 0; j < orders.length; j++) {
    var order = orders[j];
    if (!existingIds[order.id]) {
      newRows.push([
        order.id,
        order.orderNumber,
        order.status,
        JSON.stringify(order.items),
        order.subtotal,
        order.vat,
        order.total,
        order.paymentMethod,
        order.promiseTime || 0,
        new Date(order.createdAt).toISOString(),
        order.completedAt ? new Date(order.completedAt).toISOString() : ''
      ]);
    }
  }
  
  if (newRows.length > 0) {
    var lastRow = sheet.getLastRow();
    sheet.getRange(lastRow + 1, 1, newRows.length, newRows[0].length).setValues(newRows);
  }
  
  return { success: true, message: 'Synced ' + newRows.length + ' orders' };
}

function syncProducts(products) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('products');
  
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, 7).clear();
  }
  
  var rows = [];
  for (var i = 0; i < products.length; i++) {
    var p = products[i];
    rows.push([
      p.id,
      p.name,
      p.price,
      p.taxPercent,
      p.category,
      p.sortOrder,
      p.isActive
    ]);
  }
  
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  }
  
  return { success: true, message: 'Synced ' + rows.length + ' products' };
}

function updateOrderStatus(orderId, newStatus) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('orders');
  var data = sheet.getDataRange().getValues();
  
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === orderId) {
      sheet.getRange(i + 1, 3).setValue(newStatus);
      
      if (newStatus === 'completed') {
        sheet.getRange(i + 1, 11).setValue(new Date().toISOString());
      }
      
      return { success: true, message: 'Order status updated to ' + newStatus };
    }
  }
  
  return { success: false, message: 'Order not found: ' + orderId };
}

function deleteOrder(orderId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('orders');
  var data = sheet.getDataRange().getValues();
  
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === orderId) {
      sheet.deleteRow(i + 1);
      return { success: true, message: 'Order deleted: ' + orderId };
    }
  }
  
  return { success: false, message: 'Order not found: ' + orderId };
}

function getOrders(dateStr) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('orders');
  var data = sheet.getDataRange().getValues();
  
  var orders = [];
  var targetDate = dateStr ? new Date(dateStr).toDateString() : new Date().toDateString();
  
  for (var i = 1; i < data.length; i++) {
    var createdAt = new Date(data[i][9]);
    if (createdAt.toDateString() === targetDate) {
      orders.push({
        id: data[i][0],
        orderNumber: data[i][1],
        status: data[i][2],
        items: JSON.parse(data[i][3]),
        subtotal: data[i][4],
        vat: data[i][5],
        total: data[i][6],
        paymentMethod: data[i][7],
        promiseTime: data[i][8],
        createdAt: data[i][9],
        completedAt: data[i][10]
      });
    }
  }
  
  return { success: true, orders: orders };
}

function getProducts() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('products');
  var data = sheet.getDataRange().getValues();
  
  var products = [];
  for (var i = 1; i < data.length; i++) {
    products.push({
      id: data[i][0],
      name: data[i][1],
      price: data[i][2],
      taxPercent: data[i][3],
      category: data[i][4],
      sortOrder: data[i][5],
      isActive: data[i][6] === true || data[i][6] === 'true'
    });
  }
  
  return { success: true, products: products };
}

function getTodaySummary() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('orders');
  var data = sheet.getDataRange().getValues();
  
  var today = new Date().toDateString();
  var totalSales = 0;
  var orderCount = 0;
  
  for (var i = 1; i < data.length; i++) {
    var createdAt = new Date(data[i][9]);
    if (createdAt.toDateString() === today) {
      totalSales += parseFloat(data[i][6]) || 0;
      orderCount++;
    }
  }
  
  return { success: true, todaySales: totalSales, todayOrders: orderCount };
}
