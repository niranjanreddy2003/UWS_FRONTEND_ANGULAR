import { Component } from '@angular/core';

@Component({
  selector: 'app-user-settings',
  standalone:true,
  imports: [],
  templateUrl: './user-settings.component.html',
  styleUrl: './user-settings.component.css'
})
export class UserSettingsComponent {
  collectionReminder: boolean = false;
  specialPickupAlert: boolean = false;
  wasteReductionTips: boolean = false;

  // Contact methods
  contactMethods = [
    {
      icon: 'bi-headset',
      label: 'Customer Support',
      action: this.callSupport
    },
    {
      icon: 'bi-envelope-fill',
      label: 'Email Support',
      action: this.emailSupport
    },
    {
      icon: 'bi-chat-dots-fill',
      label: 'Live Chat',
      action: this.startLiveChat
    }
  ];

  // Waste management tips
  wasteManagementTips = [
    'Clean and dry recyclables before disposal',
    'Separate waste into correct categories',
    'Reduce single-use plastics',
    'Compost organic waste'
  ];

  // Contact method handlers
  callSupport() {
    window.location.href = 'tel:+1800WASTE';
  }

  emailSupport() {
    window.location.href = 'mailto:support@urbanwaste.com';
  }

  startLiveChat() {
    // Placeholder for live chat functionality
    console.log('Initiating live chat');
    alert('Live chat feature coming soon!');
  }

  // Toggle notification preferences
  toggleNotification(type: string) {
    switch (type) {
      case 'collection':
        this.collectionReminder = !this.collectionReminder;
        break;
      case 'special':
        this.specialPickupAlert = !this.specialPickupAlert;
        break;
      case 'tips':
        this.wasteReductionTips = !this.wasteReductionTips;
        break;
    }
  }

  // View more tips
  viewMoreTips() {
    // Placeholder for expanding tips
    console.log('View more tips');
    alert('More waste management tips coming soon!');
  }
}
