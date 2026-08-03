/*
 * ESP32 BLE LED Controller
 * Receives dimming values (0-100) from Mobile App and controls LED using PWM.
 */

#include <BLEDevice.h>
#include <BLEUtils.h>
#include <BLEServer.h>

// 1. Define Unique UUIDs (You can make these up, but they must match the mobile app)
#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"

// 2. Select the LED Pin (GPIO 2 is the built-in blue LED on most ESP32 boards)
const int LED_PIN = 2; 

bool deviceConnected = false;

// 3. Callback class to handle incoming Bluetooth writes
class MyCharacteristicCallbacks : public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic *pCharacteristic) {
      // Read the raw byte data sent from the mobile app
      String rxValue = pCharacteristic->getValue();

      if (rxValue.length() > 0) {
        // Read the first byte of the data as a number (0 to 100)
        int sliderVal = (int)rxValue[0]; 
        
        Serial.print("Received Value: ");
        Serial.println(sliderVal);

        // Limit range between 0 and 100 just to be safe
        sliderVal = constrain(sliderVal, 0, 100);

        // Map 0-100 percentage to 0-255 PWM duty cycle (analogWrite range)
        int pwmVal = map(sliderVal, 0, 100, 0, 255);
        
        // Write the PWM value to the LED pin to change brightness
        analogWrite(LED_PIN, pwmVal); 
      }
    }
};

// 4. Callback class to monitor Bluetooth connection status
class MyServerCallbacks : public BLEServerCallbacks {
    void onConnect(BLEServer* pServer) {
      deviceConnected = true;
      Serial.println("Phone connected!");
    };

    void onDisconnect(BLEServer* pServer) {
      deviceConnected = false;
      Serial.println("Phone disconnected. Restarting advertising...");
      // Restart advertising so the phone can find it again
      delay(500); // Give the BLE stack time to reset
      pServer->startAdvertising(); 
    }
};

void setup() {
  Serial.begin(115200);
  
  // Set LED pin as output
  pinMode(LED_PIN, OUTPUT);
  analogWrite(LED_PIN, 0); // Start with LED turned off

  Serial.println("Starting BLE Server...");

  // Initialize the BLE Device with a name
  BLEDevice::init("ESP32-LED-CTRL");

  // Create the BLE Server
  BLEServer *pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  // Create the BLE Service
  BLEService *pService = pServer->createService(SERVICE_UUID);

  // Create the BLE Write Characteristic
  BLECharacteristic *pCharacteristic = pService->createCharacteristic(
                                         CHARACTERISTIC_UUID,
                                         BLECharacteristic::PROPERTY_WRITE
                                       );

  // Attach our callbacks to the characteristic so onWrite() triggers
  pCharacteristic->setCallbacks(new MyCharacteristicCallbacks());

  // Start the service
  pService->start();

  // Start advertising so phones can scan and find us
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06);  // Android connection helpers
  pAdvertising->setMinPreferred(0x12);
  
  BLEDevice::startAdvertising();
  Serial.println("BLE Device Advertising! Ready for connection...");
}

void loop() {
  // Loop stays empty because Bluetooth callbacks handle everything in the background!
  delay(10);
}