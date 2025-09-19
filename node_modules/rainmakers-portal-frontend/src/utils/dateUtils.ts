import { format } from 'date-fns'

// Helper function to safely convert timestamps to dates
export const safeFormatDate = (timestamp: any, formatString: string): string => {
  try {
    let date: Date;
    
    // Handle null/undefined first
    if (!timestamp) {
      return 'No date';
    }
    
    // Handle Firebase Timestamp objects
    if (timestamp && typeof timestamp === 'object' && timestamp.toDate) {
      date = timestamp.toDate();
    } 
    // Handle Firebase Timestamp objects with seconds/nanoseconds
    else if (timestamp && typeof timestamp === 'object' && timestamp.seconds) {
      date = new Date(timestamp.seconds * 1000);
    }
    // Handle Date objects (already converted by backend)
    else if (timestamp instanceof Date) {
      date = timestamp;
    }
    // Handle ISO string timestamps
    else if (typeof timestamp === 'string') {
      date = new Date(timestamp);
    }
    // Handle numeric timestamps
    else if (typeof timestamp === 'number') {
      date = new Date(timestamp);
    }
    // Handle objects with _seconds property (Firebase Timestamp serialized)
    else if (timestamp && typeof timestamp === 'object' && timestamp._seconds) {
      date = new Date(timestamp._seconds * 1000);
    }
    // Handle objects with toISOString method
    else if (timestamp && typeof timestamp === 'object' && timestamp.toISOString) {
      date = new Date(timestamp.toISOString());
    }
    // Try to convert any object to string first, then to date
    else if (timestamp && typeof timestamp === 'object') {
      const stringValue = String(timestamp);
      if (stringValue !== '[object Object]') {
        date = new Date(stringValue);
      } else {
        return 'No date';
      }
    }
    else {
      return 'No date';
    }
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return 'No date';
    }
    
    return format(date, formatString);
  } catch (error) {
    return 'No date';
  }
}

// Common date format helpers
export const formatDate = (timestamp: any): string => {
  return safeFormatDate(timestamp, 'MMM d, yyyy');
}

export const formatDateTime = (timestamp: any): string => {
  return safeFormatDate(timestamp, 'MMM d, yyyy h:mm a');
}

export const formatTime = (timestamp: any): string => {
  return safeFormatDate(timestamp, 'h:mm a');
}

export const formatFullDate = (timestamp: any): string => {
  return safeFormatDate(timestamp, 'EEEE, MMMM d, yyyy');
}
