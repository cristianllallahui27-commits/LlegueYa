"""Límite de solicitudes por clave (IP) con ventana deslizante, en memoria.

Protección básica contra fuerza bruta y abuso. En producción se complementa
con el límite de nginx/Cloudflare.
"""
import time
from collections import defaultdict, deque


class LimiteSimple:
    def __init__(self, maximo=30, ventana=60.0, reloj=time.monotonic):
        self.maximo, self.ventana, self.reloj = maximo, ventana, reloj
        self.registros = defaultdict(deque)

    def permitir(self, clave: str) -> bool:
        ahora = self.reloj()
        cola = self.registros[clave]
        while cola and cola[0] <= ahora - self.ventana:
            cola.popleft()
        if len(cola) >= self.maximo:
            return False
        cola.append(ahora)
        return True
