# BloxWorld 3D - Sandbox Avatar

Un entorno interactivo en 3D desarrollado para navegadores web utilizando **Three.js** (mediante import maps y módulos ES), **HTML5** y **CSS3 de alta fidelidad**. El proyecto permite controlar un avatar articulado estilo Roblox en un escenario flotante con físicas simples, plataformas móviles y personalización de colores en tiempo real.

---

## 🎮 Características Clave

- **Avatar Estilo Roblox**: Un modelo articulado de bloques (cabeza con cara sonriente generada dinámicamente, torso, extremidades) que responde inercialmente y cambia de dirección al moverse.
- **Ciclos de Animación**:
  - *Reposo (Idle)*: Respiración sutil y movimiento leve de hombros.
  - *Caminar (Walk)*: Balanceo coordinado en contrafase de extremidades y rebotes verticales según la velocidad del paso.
  - *Saltar (Jump)*: Brazos levantados y rodillas flexionadas en suspensión.
- **Escenario Dinámico**: 
  - Isla flotante principal cubierta de pasto.
  - Plataformas elevadas fijas de colores estilo *staircase*.
  - Plataforma móvil horizontal que transporta físicamente al avatar al pararse sobre ella.
  - Rampa inclinada con cálculo exacto de altura para subir y bajar de forma suave.
- **Sistema de Coleccionables (Monedas)**: Monedas de oro giratorias flotantes que se desvanecen al recolectarse, disparan efectos de sonido retro e incrementan el HUD.
- **Efectos Visuales**: Sistema de partículas doradas en 3D que explotan y caen con gravedad al recolectar monedas, iluminación ambiental y direccional con sombras suavizadas en tiempo real, y niebla de profundidad.
- **Personalización Completa**: Panel lateral con diseño *glassmorphism* que permite pintar el torso (camisa), pantalones y piel (cabeza/brazos) del avatar de manera instantánea.
- **Audio Sintetizado Retro**: Efectos acústicos de 8-bits generados programáticamente a través de la **Web Audio API** del navegador (sin necesidad de descargar archivos de audio externos).

---

## ⚙️ Controles del Juego

### Teclado y Ratón (PC)
- **WASD / Flechas**: Mover el avatar.
- **Espacio**: Saltar.
- **Arrastrar Click Izquierdo (sobre canvas)**: Rotar la cámara alrededor del avatar.
- **Rueda del Ratón**: Zoom (acercar/alejar la cámara).

### Controles Táctiles (Móviles / Tablets)
- **Joystick Virtual (Lado izquierdo)**: Mover el avatar de forma omnidireccional.
- **Botón de Salto ▲ (Lado derecho)**: Saltar.
- **Arrastrar en pantalla (fuera del joystick)**: Rotar la cámara.

---

## 🛠️ Tecnologías Utilizadas

- **Core**: HTML5, Vanilla CSS3 (diseño responsivo y glassmorphic).
- **Lógica de Programación**: JavaScript Moderno (ES6 Modules).
- **Librería 3D**: Three.js (versión `r160`) cargado mediante un mapa de importación modular.
- **Efectos de Audio**: Web Audio API (Osciladores y nodos de ganancia dinámica).

---

## 🚀 Cómo Ejecutar el Proyecto

Debido a que el juego utiliza módulos de JavaScript importados (`type="module"`), los navegadores restringen la carga directa desde el sistema de archivos local (`file://`) por políticas de seguridad (CORS). **Es necesario servir la carpeta a través de un servidor web local**.

### Método Rápido (Node.js/npm)
Si tienes Node.js instalado, puedes levantar un servidor web instantáneo ejecutando en la terminal:

```bash
npx http-server -p 8080
```

Luego, abre tu navegador web preferido e ingresa a:
👉 [http://127.0.0.1:8080](http://127.0.0.1:8080)
