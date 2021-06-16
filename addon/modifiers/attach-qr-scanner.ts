import Ember from 'ember';
import Modifier from 'ember-modifier';
import { inject as service } from '@ember/service';

type JSQR = typeof import('jsqr').default;
type QRCode = import('jsqr').QRCode;

import { drawBox, drawScanArea } from './graphics/box';

import ScannerService from 'ember-jsqr/services/ember-jsqr/-private/no-really-do-not-directly-access-this-service/scanner';

type Args = {
  positional: [MediaStream];
  named: {
    onData: <T>(data: string) => T;
    onReady: <T>() => T;
    highlightColor?: string;
    scanAreaSize?: number | 'ALL';
    scanDelay?: number | 'ALL';
  };
};

type ScanArea = {
  x: number;
  y: number;
  w: number;
  h: number;
};

const DEFAULT_COLOR = '#FF3B58';
const DEFAULT_SCAN_AREA_SIZE = 'ALL';
const DEFAULT_SCAN_DELAY = 0;
const KEY = 'ember-jsqr/-private/no-really-do-not-directly-access-this-service/scanner';

export default class AttachQrScannerModifier extends Modifier<Args> {
  @service(KEY) declare scanner: ScannerService;

  declare video?: HTMLVideoElement;
  declare canvas?: CanvasRenderingContext2D | null;
  declare element: HTMLCanvasElement;

  _tick: FrameRequestCallback = () => ({});

  lastScannedAt = 0;

  get videoStream() {
    return this.args.positional[0];
  }

  get onData() {
    return this.args?.named.onData;
  }

  get onReady() {
    return this.args?.named.onReady;
  }

  get color() {
    return this.args?.named.highlightColor || DEFAULT_COLOR;
  }

  get scanAreaSize() {
    return this.args?.named.scanAreaSize || DEFAULT_SCAN_AREA_SIZE;
  }

  get scanDelay() {
    return this.args?.named.scanDelay || DEFAULT_SCAN_DELAY;
  }

  get scanArea() {
    if (this.scanAreaSize === 'ALL') {
      return {
        x: 0,
        y: 0,
        w: this.element.width,
        h: this.element.height,
      };
    } else {
      return {
        x: Math.round((this.element.width - this.scanAreaSize) / 2),
        y: Math.round((this.element.height - this.scanAreaSize) / 2),
        w: this.scanAreaSize,
        h: this.scanAreaSize,
      };
    }
  }

  didInstall() {
    this.canvas = this.element.getContext('2d');
  }

  didReceiveArguments() {
    if (this.videoStream) {
      this.video = document.createElement('video');

      if (!Ember?.testing) {
        this.video.srcObject = this.videoStream;
        this.video.setAttribute('playsInline', 'true');
        this.video.play();
      }

      this.startScanning();
    }
  }

  willRemove() {
    this.scanner.cleanup();
    this.video?.remove();
  }

  async startScanning() {
    this._tick = this.tick.bind(this);

    await this.scanner.start({ onData: this.onData });
    this.onReady?.();

    requestAnimationFrame(this._tick);
  }

  tick() {
    if (!this.scanner.jsQR) return;
    if (!this.video || !this.canvas) return;
    if (this.isDestroyed || this.isDestroying) return;

    if (this.video.readyState === this.video.HAVE_ENOUGH_DATA) {
      this.element.height = this.video.videoHeight;
      this.element.width = this.video.videoWidth;

      this.canvas.drawImage(this.video, 0, 0, this.element.width, this.element.height);

      if (this.scanAreaSize !== 'ALL') {
        drawScanArea({
          canvas: this.canvas,
          scanArea: this.scanArea,
          element: this.element,
        });
      }

      const now = Date.now();
      if (now - this.lastScannedAt > this.scanDelay) {
        this.lastScannedAt = now;
        scan({
          jsQR: this.scanner.jsQR,
          canvas: this.canvas,
          scanArea: this.scanArea,
          scanner: this.scanner,
          onScan: (code) =>
            drawBox({
              canvas: this.canvas!, // TS, huh?
              scanArea: this.scanArea,
              location: code.location,
              color: this.color,
            }),
        });
      }
    }

    requestAnimationFrame(this._tick);
  }
}

type ScanArgs = {
  canvas: CanvasRenderingContext2D;
  jsQR: JSQR;
  scanArea: ScanArea;
  scanner: ScannerService;
  onScan: (code: QRCode) => void;
};

/**
 * @note
 * See the service about why this is the way it is.
 */
function scan({ canvas, jsQR, scanArea, scanner, onScan }: ScanArgs) {
  let imageData = canvas.getImageData(scanArea.x, scanArea.y, scanArea.w, scanArea.h);
  let code = jsQR(imageData.data, scanArea.w, scanArea.h, {
    inversionAttempts: 'dontInvert',
  });

  if (code) {
    onScan(code);

    // calls the modifier's passed 'onData' method.
    scanner.foundQRCode(code.data);
  }

  return code;
}
