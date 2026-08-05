import {
  Component,
  Input,
  Output,
  EventEmitter,
  ElementRef,
  ViewChild,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-camera-capture',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, TooltipModule],
  templateUrl: './camera-capture.html',
  styleUrl: './camera-capture.scss',
})
export class CameraCapture implements OnInit, OnDestroy {
  @Input() photos: string[] = [];
  @Input() maxPhotos: number = 4;
  @Input() stageLabel: string = 'Entrada';
  @Output() photosChange = new EventEmitter<string[]>();

  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  cameraActive = signal<boolean>(false);
  cameraLoading = signal<boolean>(false);
  cameraError = signal<string | null>(null);
  availableDevices = signal<MediaDeviceInfo[]>([]);
  selectedDeviceId = signal<string | null>(null);
  previewPhotoIndex = signal<number | null>(null);

  private stream: MediaStream | null = null;

  ngOnInit(): void {
    this.enumerateDevices();
  }

  ngOnDestroy(): void {
    this.stopCamera();
  }

  async enumerateDevices(): Promise<void> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === 'videoinput');
      this.availableDevices.set(videoDevices);
      if (videoDevices.length > 0 && !this.selectedDeviceId()) {
        const envDevice = videoDevices.find(
          (d) =>
            d.label.toLowerCase().includes('back') ||
            d.label.toLowerCase().includes('trasera') ||
            d.label.toLowerCase().includes('environment')
        );
        this.selectedDeviceId.set(envDevice ? envDevice.deviceId : videoDevices[0].deviceId);
      }
    } catch {
      // Ignorar si el navegador bloquea la enumeración previa
    }
  }

  async startCamera(): Promise<void> {
    this.cameraError.set(null);
    this.cameraLoading.set(true);

    this.stopCamera();

    const attempts: MediaStreamConstraints[] = [];

    // Intento 1: Con ID de cámara seleccionada
    if (this.selectedDeviceId()) {
      attempts.push({
        video: { deviceId: { ideal: this.selectedDeviceId()! } },
        audio: false,
      });
    }

    // Intento 2: Cámara trasera preferida (Móvil / Tablet)
    attempts.push({
      video: { facingMode: { ideal: 'environment' } },
      audio: false,
    });

    // Intento 3: Cualquier entrada de video estándar / Webcam
    attempts.push({
      video: true,
      audio: false,
    });

    let lastError: any = null;

    for (const constraints of attempts) {
      try {
        this.stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (this.stream) break;
      } catch (err: any) {
        lastError = err;
      }
    }

    this.cameraLoading.set(false);

    if (this.stream) {
      this.cameraActive.set(true);

      setTimeout(() => {
        if (this.videoElement && this.videoElement.nativeElement) {
          this.videoElement.nativeElement.srcObject = this.stream;
          this.videoElement.nativeElement.play().catch(() => {});
        }
      }, 100);

      await this.enumerateDevices();
    } else {
      this.cameraActive.set(false);

      let msg = 'No se pudo acceder a la cámara en el navegador.';

      const isUnsecureContext =
        location.protocol !== 'https:' &&
        location.hostname !== 'localhost' &&
        location.hostname !== '127.0.0.1';

      if (isUnsecureContext) {
        msg =
          'Los navegadores bloquean la cámara web en directo por HTTP en red local. Haz clic en "Tomar Foto Móvil / Archivo" para abrir la cámara nativa del teléfono directamente.';
      } else if (lastError?.name === 'NotAllowedError' || lastError?.name === 'PermissionDeniedError') {
        msg =
          'Permiso de cámara denegado. Haz clic en el icono de candado/cámara en la barra de direcciones del navegador para permitir el acceso.';
      } else if (lastError?.name === 'NotFoundError' || lastError?.name === 'DevicesNotFoundError') {
        msg =
          'No se detectó ninguna cámara conectada a este equipo. Puedes usar una webcam USB, DroidCam o el botón "Tomar Foto / Archivo".';
      } else if (lastError?.name === 'NotReadableError' || lastError?.name === 'TrackStartError') {
        msg =
          'La cámara está en uso por otra aplicación o pestaña del navegador. Cierra la otra app e intenta nuevamente.';
      }

      this.cameraError.set(msg);
    }
  }

  onDeviceSelect(deviceId: string): void {
    this.selectedDeviceId.set(deviceId);
    if (this.cameraActive()) {
      this.startCamera();
    }
  }

  stopCamera(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    this.cameraActive.set(false);
  }

  switchCamera(): void {
    const devices = this.availableDevices();
    if (devices.length <= 1) return;
    const currentIndex = devices.findIndex((d) => d.deviceId === this.selectedDeviceId());
    const nextIndex = (currentIndex + 1) % devices.length;
    this.onDeviceSelect(devices[nextIndex].deviceId);
  }

  capturePhoto(): void {
    if (this.photos.length >= this.maxPhotos) return;
    if (!this.videoElement || !this.canvasElement) return;

    const video = this.videoElement.nativeElement;
    const canvas = this.canvasElement.nativeElement;

    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

    const updated = [...this.photos, dataUrl];
    this.photosChange.emit(updated);
  }

  removePhoto(index: number, event?: Event): void {
    if (event) event.stopPropagation();
    const updated = this.photos.filter((_, i) => i !== index);
    this.photosChange.emit(updated);
  }

  triggerFileInput(): void {
    if (this.fileInput && this.fileInput.nativeElement) {
      this.fileInput.nativeElement.click();
    }
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const files = Array.from(input.files);
    const availableSlots = this.maxPhotos - this.photos.length;
    const filesToProcess = files.slice(0, availableSlots);

    filesToProcess.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        if (e.target?.result) {
          const dataUrl = e.target.result as string;
          this.photosChange.emit([...this.photos, dataUrl]);
        }
      };
      reader.readAsDataURL(file);
    });

    input.value = '';
  }
}
