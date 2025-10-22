import { Router, Request, Response } from 'express';
import { FirebaseService, Appointment } from '../services/firebaseService';
import { GHLService } from '../services/ghlService';
import { Timestamp } from 'firebase-admin/firestore';

const router = Router();

// Terms and Conditions Content
const TERMS_AND_CONDITIONS = `
# Terms and Conditions for Appointment Calling System

## Purpose
This system allows authorized users to make calls to contacts based on appointments scheduled in GoHighLevel (GHL).

## User Responsibilities
1. **Professional Conduct**: All calls must be conducted professionally and respectfully
2. **Accurate Information**: Provide accurate information about call outcomes and follow-up actions
3. **Privacy Compliance**: Handle contact information in accordance with privacy laws and company policies
4. **Timely Reporting**: Submit call notes promptly after completing calls

## Data Privacy and Contact Information
1. **Confidentiality**: All contact information is confidential and must not be shared outside the organization
2. **Purpose Limitation**: Contact information may only be used for legitimate business purposes related to the appointment
3. **Data Security**: Users must take reasonable steps to protect contact information from unauthorized access

## Professional Conduct Expectations
1. **Respectful Communication**: Treat all contacts with respect and professionalism
2. **Accurate Representation**: Represent the company accurately and honestly
3. **Compliance**: Follow all applicable laws and regulations during calls
4. **Documentation**: Maintain accurate records of all interactions

## Consent and Tracking
1. **Call Tracking**: The system tracks call activities for quality assurance and reporting purposes
2. **Data Retention**: Call notes and outcomes are retained for business and legal purposes
3. **Access Control**: Only authorized personnel have access to call data

## Right to Revoke Access
The company reserves the right to revoke access to the appointment calling system at any time for:
- Violation of these terms and conditions
- Unprofessional conduct
- Misuse of contact information
- Any other reason deemed necessary by management

## Acceptance
By accepting these terms, you acknowledge that you have read, understood, and agree to comply with all provisions outlined above.

Version: v1.0
Last Updated: ${new Date().toISOString().split('T')[0]}
`;

// User Endpoints

// Get terms and conditions text
router.get('/terms', async (req: Request, res: Response) => {
  try {
    res.json({ terms: TERMS_AND_CONDITIONS });
  } catch (error) {
    console.error('Error getting terms:', error);
    res.status(500).json({ error: 'Failed to get terms and conditions' });
  }
});

// Accept terms and conditions
router.post('/accept-terms', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Check if user has already accepted terms
    const hasAccepted = await FirebaseService.hasUserAcceptedTerms(userId);
    if (hasAccepted) {
      return res.status(400).json({ error: 'Terms already accepted' });
    }

    // Record terms acceptance
    await FirebaseService.recordTermsAcceptance(userId, {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({ message: 'Terms and conditions accepted successfully' });
  } catch (error) {
    console.error('Error accepting terms:', error);
    res.status(500).json({ error: 'Failed to accept terms and conditions' });
  }
});

// Check if user accepted terms
router.get('/terms-status', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const hasAccepted = await FirebaseService.hasUserAcceptedTerms(userId);
    res.json({ hasAccepted });
  } catch (error) {
    console.error('Error checking terms status:', error);
    res.status(500).json({ error: 'Failed to check terms status' });
  }
});

// Get user's assigned appointments
router.get('/my-assignments', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Check if user has accepted terms
    const hasAccepted = await FirebaseService.hasUserAcceptedTerms(userId);
    if (!hasAccepted) {
      return res.status(403).json({ error: 'Terms and conditions must be accepted first' });
    }

    const appointments = await FirebaseService.getAppointmentsByUserId(userId);
    res.json({ appointments });
  } catch (error) {
    console.error('Error getting user appointments:', error);
    res.status(500).json({ error: 'Failed to get appointments' });
  }
});

// Submit call notes after calling
router.post('/:id/call-notes', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const appointmentId = req.params.id;
    const { callNotes, callOutcome, callDuration, followUpDate, appointmentStatusUpdate } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!callNotes || !callOutcome) {
      return res.status(400).json({ error: 'Call notes and outcome are required' });
    }

    // Get the appointment
    const appointment = await FirebaseService.getAppointmentById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    // Check if user is assigned to this appointment
    if (appointment.assignedToUserId !== userId) {
      return res.status(403).json({ error: 'Not authorized to update this appointment' });
    }

    // Update appointment with call notes
    const updateData: Partial<Appointment> = {
      callNotes,
      callOutcome,
      callDuration: callDuration ? parseInt(callDuration) : undefined,
      appointmentStatusUpdate,
      calledAt: Timestamp.now(),
      status: callOutcome === 'successful' ? 'completed' : 'called'
    };

    if (followUpDate) {
      updateData.followUpDate = Timestamp.fromDate(new Date(followUpDate));
    }

    if (callOutcome === 'successful') {
      updateData.completedAt = Timestamp.now();
    }

    const updatedAppointment = await FirebaseService.updateAppointment(appointmentId, updateData);
    res.json({ appointment: updatedAppointment });
  } catch (error) {
    console.error('Error submitting call notes:', error);
    res.status(500).json({ error: 'Failed to submit call notes' });
  }
});

// Get appointment details
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const appointmentId = req.params.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const appointment = await FirebaseService.getAppointmentById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    // Check if user is assigned to this appointment or is admin
    if (appointment.assignedToUserId !== userId && !req.user?.isAdmin) {
      return res.status(403).json({ error: 'Not authorized to view this appointment' });
    }

    res.json({ appointment });
  } catch (error) {
    console.error('Error getting appointment details:', error);
    res.status(500).json({ error: 'Failed to get appointment details' });
  }
});

// Admin Endpoints

// List all appointments with filters
router.get('/admin/list', async (req: Request, res: Response) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { status, assignedToUserId, startDate, endDate } = req.query;
    
    const filters: any = {};
    if (status) filters.status = status as string;
    if (assignedToUserId) filters.assignedToUserId = assignedToUserId as string;
    if (startDate) filters.startDate = new Date(startDate as string);
    if (endDate) filters.endDate = new Date(endDate as string);

    const appointments = await FirebaseService.getAllAppointments(filters);
    res.json({ appointments });
  } catch (error) {
    console.error('Error getting appointments list:', error);
    res.status(500).json({ error: 'Failed to get appointments list' });
  }
});

// Sync appointments from GHL
router.post('/admin/sync', async (req: Request, res: Response) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { startDate, endDate, calendarId, subAccountId } = req.body;
    
    // Validate sub-account if provided
    let subAccount = null;
    if (subAccountId) {
      subAccount = await FirebaseService.getSubAccountById(subAccountId);
      if (!subAccount) {
        return res.status(400).json({ error: 'Sub-account not found' });
      }
    }
    
    // Get appointments from GHL
    const ghlAppointments = await GHLService.getAppointments({
      calendarId,
      startDate,
      endDate,
      subAccountId
    });

    let syncedCount = 0;
    let skippedCount = 0;

    for (const ghlAppointment of ghlAppointments) {
      try {
        // Check if appointment already exists
        const existingAppointments = await FirebaseService.getAllAppointments({
          startDate: new Date(ghlAppointment.startTime),
          endDate: new Date(ghlAppointment.endTime)
        });
        
        const exists = existingAppointments.some(apt => 
          apt.ghlAppointmentId === ghlAppointment.id && 
          apt.subAccountId === (subAccountId || 'default')
        );

        if (exists) {
          skippedCount++;
          continue;
        }

        // Get contact information
        const contact = await GHLService.getContactById(ghlAppointment.contactId);
        
        // Create appointment in Firebase
        await FirebaseService.createAppointment({
          ghlAppointmentId: ghlAppointment.id,
          ghlCalendarId: ghlAppointment.calendarId,
          ghlContactId: ghlAppointment.contactId,
          subAccountId: subAccountId || 'default',
          contactName: contact?.name || 'Unknown Contact',
          contactEmail: contact?.email || '',
          contactPhone: contact?.phone || '',
          appointmentDate: Timestamp.fromDate(new Date(ghlAppointment.startTime)),
          appointmentTitle: ghlAppointment.title,
          appointmentNotes: ghlAppointment.notes,
          status: 'unassigned'
        });

        syncedCount++;
      } catch (appointmentError) {
        console.error('Error syncing individual appointment:', appointmentError);
        skippedCount++;
      }
    }

    res.json({ 
      message: 'Appointments synced successfully',
      syncedCount,
      skippedCount,
      totalFromGHL: ghlAppointments.length,
      subAccountName: subAccount?.name || 'Default'
    });
  } catch (error) {
    console.error('Error syncing appointments:', error);
    res.status(500).json({ error: 'Failed to sync appointments from GHL' });
  }
});

// Assign appointment to user
router.post('/admin/assign', async (req: Request, res: Response) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { appointmentId, userId } = req.body;

    if (!appointmentId || !userId) {
      return res.status(400).json({ error: 'Appointment ID and User ID are required' });
    }

    // Check if user has accepted terms
    const hasAccepted = await FirebaseService.hasUserAcceptedTerms(userId);
    if (!hasAccepted) {
      return res.status(400).json({ error: 'User must accept terms and conditions before being assigned appointments' });
    }

    // Get the appointment
    const appointment = await FirebaseService.getAppointmentById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    // Update appointment assignment
    const updatedAppointment = await FirebaseService.updateAppointment(appointmentId, {
      assignedToUserId: userId,
      assignedByUserId: req.user.id,
      assignedAt: Timestamp.now(),
      status: 'assigned'
    });

    res.json({ appointment: updatedAppointment });
  } catch (error) {
    console.error('Error assigning appointment:', error);
    res.status(500).json({ error: 'Failed to assign appointment' });
  }
});

// Unassign appointment
router.put('/admin/:id/unassign', async (req: Request, res: Response) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const appointmentId = req.params.id;

    // Get the appointment
    const appointment = await FirebaseService.getAppointmentById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    // Update appointment to unassigned
    const updatedAppointment = await FirebaseService.updateAppointment(appointmentId, {
      assignedToUserId: undefined,
      assignedByUserId: undefined,
      assignedAt: undefined,
      status: 'unassigned'
    });

    res.json({ appointment: updatedAppointment });
  } catch (error) {
    console.error('Error unassigning appointment:', error);
    res.status(500).json({ error: 'Failed to unassign appointment' });
  }
});

// Get appointment statistics
router.get('/admin/stats', async (req: Request, res: Response) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const allAppointments = await FirebaseService.getAllAppointments();
    
    const stats = {
      total: allAppointments.length,
      unassigned: allAppointments.filter(apt => apt.status === 'unassigned').length,
      assigned: allAppointments.filter(apt => apt.status === 'assigned').length,
      called: allAppointments.filter(apt => apt.status === 'called').length,
      completed: allAppointments.filter(apt => apt.status === 'completed').length,
      noAnswer: allAppointments.filter(apt => apt.status === 'no-answer').length,
      rescheduled: allAppointments.filter(apt => apt.status === 'rescheduled').length,
      cancelled: allAppointments.filter(apt => apt.status === 'cancelled').length
    };

    res.json({ stats });
  } catch (error) {
    console.error('Error getting appointment stats:', error);
    res.status(500).json({ error: 'Failed to get appointment statistics' });
  }
});

// Sub-account management routes

// Get all sub-accounts
router.get('/admin/sub-accounts', async (req: Request, res: Response) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const subAccounts = await FirebaseService.getAllSubAccounts();
    res.json({ subAccounts });
  } catch (error) {
    console.error('Error getting sub-accounts:', error);
    res.status(500).json({ error: 'Failed to get sub-accounts' });
  }
});

// Create sub-account
router.post('/admin/sub-accounts', async (req: Request, res: Response) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { name, apiKey, v2Token, locationId } = req.body;

    if (!name || !apiKey || !locationId) {
      return res.status(400).json({ error: 'Name, API key, and location ID are required' });
    }

    // Check if sub-account with this name already exists
    const existingSubAccount = await FirebaseService.getSubAccountByName(name);
    if (existingSubAccount) {
      return res.status(400).json({ error: 'Sub-account with this name already exists' });
    }

    const subAccount = await FirebaseService.createSubAccount({
      name,
      apiKey,
      v2Token,
      locationId,
      isActive: true
    });

    res.json({ subAccount });
  } catch (error) {
    console.error('Error creating sub-account:', error);
    res.status(500).json({ error: 'Failed to create sub-account' });
  }
});

// Update sub-account
router.put('/admin/sub-accounts/:id', async (req: Request, res: Response) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const subAccountId = req.params.id;
    const { name, apiKey, v2Token, locationId, isActive } = req.body;

    const subAccount = await FirebaseService.updateSubAccount(subAccountId, {
      name,
      apiKey,
      v2Token,
      locationId,
      isActive
    });

    if (!subAccount) {
      return res.status(404).json({ error: 'Sub-account not found' });
    }

    res.json({ subAccount });
  } catch (error) {
    console.error('Error updating sub-account:', error);
    res.status(500).json({ error: 'Failed to update sub-account' });
  }
});

// Delete sub-account
router.delete('/admin/sub-accounts/:id', async (req: Request, res: Response) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const subAccountId = req.params.id;

    // Check if there are any appointments using this sub-account
    const appointments = await FirebaseService.getAllAppointments({
      assignedToUserId: undefined // Get all appointments
    });
    
    const appointmentsUsingSubAccount = appointments.filter(apt => apt.subAccountId === subAccountId);
    if (appointmentsUsingSubAccount.length > 0) {
      return res.status(400).json({ 
        error: `Cannot delete sub-account. ${appointmentsUsingSubAccount.length} appointments are using this sub-account.` 
      });
    }

    await FirebaseService.deleteSubAccount(subAccountId);
    res.json({ message: 'Sub-account deleted successfully' });
  } catch (error) {
    console.error('Error deleting sub-account:', error);
    res.status(500).json({ error: 'Failed to delete sub-account' });
  }
});

// Test sub-account connection
router.post('/admin/sub-accounts/:id/test', async (req: Request, res: Response) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const subAccountId = req.params.id;
    const subAccount = await FirebaseService.getSubAccountById(subAccountId);

    if (!subAccount) {
      return res.status(404).json({ error: 'Sub-account not found' });
    }

    // Test the connection by trying to fetch appointments
    try {
      const appointments = await GHLService.getAppointments({
        subAccountId: subAccountId,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
      });

      res.json({ 
        success: true, 
        message: 'Connection successful',
        appointmentsFound: appointments.length
      });
    } catch (ghlError: any) {
      res.json({ 
        success: false, 
        message: `Connection failed: ${ghlError.message}` 
      });
    }
  } catch (error) {
    console.error('Error testing sub-account:', error);
    res.status(500).json({ error: 'Failed to test sub-account connection' });
  }
});

export default router;
