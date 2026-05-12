export async function renderQrCodeToCanvas(
  canvas: HTMLCanvasElement,
  value: string,
) {
  const { default: QRCode } = await import("qrcode");

  await QRCode.toCanvas(canvas, value, {
    margin: 1,
    width: 180,
  });
}
