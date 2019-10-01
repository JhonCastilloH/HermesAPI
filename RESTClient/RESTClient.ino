#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <ArduinoJson.h>

// --------CONSTANTES (won't change)--------------- 
// Sustituir por los datos de vuestro WiFi
const char* ssid = "RHGA";
const char* password = "V1NCUL4T3";

String url = "http://hermesheroku.herokuapp.com/actuators";

const char* deviceId = "bombillo1";
int LedPin = D2;
int timeLeft = 60;


// number of millisecs between blinks
const int task_A_Interval = 1000;
const int task_B_Interval = 1000;



//------------ VARIABLES (will change)---------------------
int deviceMode = 1;
unsigned long currentMillis = 0;    // stores the value of millis() in each iteration of loop()
unsigned long previous_A_Millis = 0;
unsigned long previous_B_Millis = 0;
bool led_A_State = 0;  

void setup()
{
   
   Serial.begin(115200);
   pinMode(LedPin, OUTPUT); //modo salida
   WiFi.mode(WIFI_STA);
   WiFi.begin(ssid, password);
}
 
void loop()
{

 currentMillis = millis();
  
 connection();
 setMode();
 //sleep(10);
 delay(100);
 
 Serial.printf("mode encontrado: %d\n", deviceMode);
 
}

  void checkId(const char* id, int mode, int time) {
      if (strcmp (id,"bombillo1") == 0){
        Serial.printf("Dispositivo encontrado\n");
       deviceMode = mode;
       timeLeft = time;
       setMode();
      }
  }

  void connection(){
    HTTPClient http;
    http.begin(url);
    int httpCode = http.GET();
    
    if (httpCode > 0) {
    String payload = http.getString(); //Get the request response payload
    Serial.println(payload);
    const size_t capacity = JSON_ARRAY_SIZE(16) + 4*JSON_OBJECT_SIZE(10) + 12*JSON_OBJECT_SIZE(11) + 2750;
    DynamicJsonDocument doc(capacity);
    deserializeJson(doc, payload);
     int i;
    for (i = 0; i < 5; i++){
      JsonObject root_0 = doc[i];
      const char* root_0_id = root_0["id"];
      const char* root_0_mode = root_0["mode"];
      float data_0 = root_0["timeLeft"];
      bool root_0_enable = root_0["enable"];
      checkId(root_0_id,readMOde(root_0_mode), data_0);
      //Serial.printf("DISPOSITIVO... Mode: %s\n", root_0_mode);
    }
    }
    http.end();
  }
   
   

  int readMOde(const char* mod) {
    DynamicJsonDocument modes(JSON_OBJECT_SIZE(5));
    modes["off"] = -1;
    modes["on"] = 0;
    modes["persuation"] = 1;
    modes["sleep"] = 2;
    modes["timer"] = 3;
    return modes[mod];
  }

  //============== Modes ==========================

  void setMode() {
    switch (deviceMode) {
  case 0: //On:
    digitalWrite(LedPin, false);   // Enciende el pin
    Serial.println("On"); 
    break;
  case 1: //Persuation:
    persuation(); 
    break;
  case 2: //Sleep:
    sleep(timeLeft);    
    break;
  default://Off
    digitalWrite(LedPin, true);   // Apaga el pin 
    Serial.println("Off"); 
    break;
  }
  }

//========  Tasks  ================================

void sleep(int time) {
    
    if (currentMillis - previous_A_Millis >= time*1000) {
      Serial.println("Sleep"); 
      digitalWrite(LedPin, true);
      previous_A_Millis += time*1000;
      
    }else{
      digitalWrite(LedPin, false);
      Serial.println("NO Sleep"); 
    }
    
      
    
}

void persuation() {
    if (currentMillis - previous_B_Millis >= task_B_Interval) {
      Serial.println("Persuation"); 
       led_A_State = !led_A_State;
       previous_B_Millis += task_B_Interval;
       Serial.printf("led_A_State encontrado: %d\n", led_A_State);
       digitalWrite(LedPin, led_A_State);       
       Serial.printf("DIFF: %d\n", currentMillis - previous_B_Millis);
    }
    
}
