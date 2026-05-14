declare module "qrcode" {
  const QRCode: {
    toCanvas(
      canvas: HTMLCanvasElement,
      text: string,
      options?: {
        margin?: number;
        width?: number;
      },
    ): Promise<void>;
  };

  export default QRCode;
}
