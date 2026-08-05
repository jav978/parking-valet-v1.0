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
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-camera-capture',
  standalone: true,
  imports: [CommonModule, ButtonModule, TooltipModule],
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
        // Priorizar cámara trasera 'environment' si existe en la lista
        const envDevice = videoDevices.find((d) => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('trasera'));
        this.selectedDeviceId.set(envDevice ? envDevice.deviceId : videoDevices[0].deviceId);
      }
    } catch {
      // Ignorar si el navegador bloquea enumerateDevices antes de permiso
    }
  }

  async startCamera(): Promise<void> {
    this.cameraError.set(null);
    this.cameraLoading.set(true);

    try {
      this.stopCamera();

      const constraints: MediaStreamConstraints = {
        video: this.selectedDeviceId()
          ? { deviceId: { exact: this.selectedDeviceId()! }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.cameraLoading.set(false);
      this.cameraActive.set(true);

      setTimeout(() => {
        if (this.videoElement && this.videoElement.nativeElement) {
          this.videoElement.nativeElement.srcObject = this.stream;
          this.videoElement.nativeElement.play().catch(() => {});
        }
      }, 100);

      await this.enumerateDevices();
    } catch (err: any) {
      this.cameraLoading.set(false);
      this.cameraActive.set(false);
      this.cameraError.set(
        'No se pudo acceder a la cámara. Verifica los permisos o intenta subir los archivos manualmente.'
      );
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
    this.selectedDeviceId.set(devices[nextIndex].deviceId);
    if (this.cameraActive()) {
      this.startCamera();
    }
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

    // Convertir foto a JPEG DataURL comprimido
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
