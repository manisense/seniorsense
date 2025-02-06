import { Accelerometer } from 'expo-sensors';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { STORAGE_KEYS } from '../constants';

const FALL_THRESHOLD = 20; // Acceleration threshold for fall detection (in m/s²)
const IMPACT_DURATION = 1000; // Duration to monitor for impact (in ms)
const STABILITY_THRESHOLD = 2; // Threshold for stable position after fall

interface FallDetectionConfig {
  onFallDetected: () => void;
  sensitivity?: 'low' | 'medium' | 'high';
}

export class FallDetector {
  private subscription: any = null;
  private isMonitoring = false;
  private lastAcceleration = { x: 0, y: 0, z: 0 };
  private impactStartTime: number | null = null;
  private onFallDetected: () => void;
  private sensitivity: number;

  constructor({ onFallDetected, sensitivity = 'medium' }: FallDetectionConfig) {
    this.onFallDetected = onFallDetected;
    this.sensitivity = this.getSensitivityValue(sensitivity);
  }

  private getSensitivityValue(sensitivity: 'low' | 'medium' | 'high'): number {
    switch (sensitivity) {
      case 'low': return FALL_THRESHOLD * 1.5;
      case 'high': return FALL_THRESHOLD * 0.7;
      default: return FALL_THRESHOLD;
    }
  }

  private calculateAccelerationMagnitude(x: number, y: number, z: number): number {
    return Math.sqrt(x * x + y * y + z * z);
  }

  private async setupNotifications() {
    if (Platform.OS !== 'web') {
      await Notifications.requestPermissionsAsync();
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Fall Detection',
          importance: 4, // HIGH = 4
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }
    }
  }

  private async showFallNotification() {
    if (Platform.OS !== 'web') {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Fall Detected! 📱',
          body: 'Significant movement detected. Are you okay?',
          sound: 'default'
        },
        trigger: { seconds: 1 } // Schedule for 1 second from now
      });
    }
  }

  private async handleAccelerometerData({ x, y, z }: { x: number; y: number; z: number }) {
    const currentMagnitude = this.calculateAccelerationMagnitude(x, y, z);
    const previousMagnitude = this.calculateAccelerationMagnitude(
      this.lastAcceleration.x,
      this.lastAcceleration.y,
      this.lastAcceleration.z
    );

    const accelerationDelta = Math.abs(currentMagnitude - previousMagnitude);

    // Only log if delta is significant (> 0.5)
    if (accelerationDelta > 0.5) {
      console.log(`Significant movement - Delta: ${accelerationDelta.toFixed(2)}, Magnitude: ${currentMagnitude.toFixed(2)}`);
    }

    if (accelerationDelta > this.sensitivity && !this.impactStartTime) {
      this.impactStartTime = Date.now();
      console.log(`Potential fall detected! Delta: ${accelerationDelta.toFixed(2)}, Threshold: ${this.sensitivity}`);
    } else if (this.impactStartTime) {
      const timeSinceImpact = Date.now() - this.impactStartTime;
      
      if (timeSinceImpact > IMPACT_DURATION) {
        const isStable = accelerationDelta < STABILITY_THRESHOLD;
        
        if (isStable) {
          console.log('Fall confirmed - Device stabilized after impact');
          this.impactStartTime = null;
          const fallDetectionEnabled = await AsyncStorage.getItem(STORAGE_KEYS.FALL_DETECTION_ENABLED);
          
          if (fallDetectionEnabled === 'true') {
            await this.showFallNotification();
            this.onFallDetected();
          }
        }
      }
    }

    this.lastAcceleration = { x, y, z };
  }

  public async start() {
    if (Platform.OS === 'web') {
      console.warn('Fall detection is not supported on web platform');
      return;
    }

    if (!this.isMonitoring) {
      console.log('Starting fall detection monitoring...');
      this.isMonitoring = true;
      
      await this.setupNotifications();
      await Accelerometer.setUpdateInterval(100);
      
      this.subscription = Accelerometer.addListener(data => {
        this.handleAccelerometerData(data);
      });

      console.log(`Fall detection active with ${this.sensitivity} sensitivity threshold`);
    }
  }

  public stop() {
    if (this.subscription) {
      console.log('Stopping fall detection monitoring...');
      this.subscription.remove();
      this.subscription = null;
    }
    this.isMonitoring = false;
    this.impactStartTime = null;
  }
} 