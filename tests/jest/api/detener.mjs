export default async function detener() {
  globalThis.__SERVIDOR_LLEGUEYA__?.kill();
}
