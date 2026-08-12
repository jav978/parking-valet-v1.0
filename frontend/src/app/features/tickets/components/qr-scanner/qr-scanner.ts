import { Component, OnDestroy, OnInit, output } from '@angular/core';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';

@Component({
  selector: 'app-qr-scanner',
  standalone: true,
  templateUrl: './qr-scanner.html',
  styleUrl: './qr-scanner.scss'
})
export class QrScannerComponent implements OnInit, OnDestroy {
  scanSuccess = output<string>();
  scanError = output<string>();

  private html5QrcodeScanner: Html5QrcodeScanner | null = null;
  
  ngOnInit(): void {
    this.html5QrcodeScanner = new Html5QrcodeScanner(
      "qr-reader",
      { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA]
      },
      false
    );

    this.html5QrcodeScanner.render(
      (decodedText) => {
        // Success
        this.scanSuccess.emit(decodedText);
        // Optionally clear or pause scanning
        // this.html5QrcodeScanner?.pause();
      },
      (errorMessage) => {
        // Error (usually noisy, ignore or emit depending on needs)
        // this.scanError.emit(errorMessage);
      }
    );
  }

  ngOnDestroy(): void {
    if (this.html5QrcodeScanner) {
      this.html5QrcodeScanner.clear().catch(error => {
        console.error("Failed to clear html5QrcodeScanner. ", error);
      });
    }
  }
}
