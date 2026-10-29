# Agenda de Prospectos

Aplicación web estática para registrar y dar seguimiento a prospectos de tarjetas de crédito. La información se almacena en **Supabase** mediante el schema privado `agendas`.

## Funcionalidades

- Crear, consultar, editar y eliminar prospectos.
- Ver seguimientos programados para el día actual.
- Filtrar y agrupar prospectos por mes.
- Registrar historial de ventas por prospecto.
- Compartir prospectos con otros usuarios (solo lectura o edición).
- Agenda general: publicar prospectos para consulta de todos los usuarios.
- Copiar teléfonos desde la agenda.
- Cambiar entre tema claro y oscuro.
- Elegir un color de fondo; esta acción activa el modo claro automáticamente.

## Estructura del proyecto

```text
Agendas/
├── index.html                    # Página principal
├── README.md                     # Documentación del proyecto
├── assets/
│   └── icons/                    # Iconos y favicon
├── supabase/
│   └── agendas.sql               # Schema, tablas, funciones RLS y RPCs
└── src/
    ├── components/
    │   ├── theme-toggle.js       # Componente Web para el tema claro/oscuro
    │   └── theme-background-picker.js  # Selector de color de fondo
    ├── js/
    │   ├── supabase-config.js    # Credenciales públicas de Supabase (anon key)
    │   ├── site-auth.js          # Autenticación con Supabase Auth
    │   ├── app.js                # Punto de entrada e inicialización
    │   └── modules/
    │       ├── core.js           # Estado global y helpers de UI
    │       ├── custom-selects.js # Selectores personalizados
    │       ├── date-picker.js    # Selector de fecha
    │       ├── ui.js             # Interacciones de interfaz
    │       ├── navigation.js     # Navegación entre pestañas
    │       ├── api.js            # Operaciones CRUD con Supabase
    │       ├── sharing.js        # Compartir prospectos y agenda general
    │       ├── filters.js        # Filtros y agrupación por mes
    │       ├── views.js          # Renderizado de vistas y tablas
    │       └── actions.js        # Acciones sobre prospectos (editar, eliminar, ventas)
    └── styles/
        ├── main.css              # Entrada principal de estilos (@import)
        └── modules/
            ├── base.css          # Variables CSS y estilos base
            ├── appearance.css    # Panel de apariencia (tema y fondo)
            ├── navigation.css    # Barra de navegación
            ├── forms.css         # Formularios e inputs
            ├── controls.css      # Botones y controles
            ├── tables.css        # Tablas y agrupaciones
            ├── config.css        # Panel de configuración
            ├── feedback.css      # Toasts, loaders y estados vacíos
            ├── theme.css         # Tema oscuro
            ├── modal.css         # Modales
            ├── custom-background.css  # Fondos personalizados
            ├── responsive.css    # Adaptación responsive
            └── polish.css        # Animaciones y detalles visuales
```

La lógica JavaScript está separada en módulos dentro de `src/js/modules/`. Los estilos están organizados en `src/styles/modules/` y se cargan desde `src/styles/main.css` mediante `@import`.

## Uso local

No requiere Node.js ni un proceso de compilación.

1. Descarga o clona el repositorio.
2. Abre `index.html` en un navegador.
3. Para una experiencia más estable, sirve la carpeta con cualquier servidor estático local.

También puedes usar la extensión **Live Server** de Visual Studio Code y abrir `index.html` con **Open with Live Server**.

## Configuración de Supabase

### 1. Crear el schema y las tablas

Ejecuta el archivo [`supabase/agendas.sql`](./supabase/agendas.sql) en el **SQL Editor** de tu proyecto de Supabase. Este script crea:

- El schema `agendas`.
- Las tablas `agendas.prospectos` y `agendas.ventas`.
- Las políticas RLS que vinculan cada registro con el `user_id` del usuario autenticado.
- Las funciones RPC utilizadas por la aplicación (`list_visible_prospectos`, `share_prospecto_with_username`, etc.).

### 2. Exponer el schema

En **Settings › API › Exposed schemas**, agrega `agendas` a la lista.

### 3. Configurar las credenciales

Edita [`src/js/supabase-config.js`](./src/js/supabase-config.js) con la URL y la `anon key` de tu proyecto:

```js
window.SUPABASE_CONFIG = {
  url: "https://<tu-proyecto>.supabase.co",
  anonKey: "<tu-anon-key>",
};
```

> La `anon key` es pública y está protegida por las políticas RLS. **Nunca coloques aquí una `service role key`.**

### 4. Verificar la conexión

Abre la aplicación, inicia sesión y usa el botón **Probar conexión** en la pestaña de configuración para confirmar que el acceso a Supabase está activo.

## Autenticación

La aplicación usa **Supabase Auth** (email + contraseña). El flujo de sesión está manejado por [`src/js/site-auth.js`](./src/js/site-auth.js):

- Muestra el formulario de inicio de sesión si no hay sesión activa.
- Carga la lista de prospectos automáticamente al recuperar una sesión válida.
- Cierra la sesión desde el botón de logout en el header.

## Persistencia y RLS

Cada prospecto y venta tiene un campo `user_id` que referencia al usuario autenticado. Las políticas RLS garantizan que cada usuario solo puede ver y modificar sus propios registros, salvo los que hayan sido compartidos explícitamente o publicados en la agenda general.

## Compartir prospectos

Un usuario puede compartir cualquiera de sus prospectos con otro usuario registrado, otorgando permiso de solo lectura o de edición. Esto se gestiona desde el modal **Compartir** en las acciones de cada registro, utilizando las RPCs definidas en `agendas.sql`.

## Dependencias externas

- [Supabase JS v2](https://github.com/supabase/supabase-js) — cliente de base de datos y autenticación (cargado desde CDN).
- [Google Material Symbols Rounded](https://fonts.google.com/icons) — iconos de la interfaz.
- [Space Grotesk](https://fonts.google.com/specimen/Space+Grotesk) e [Inter](https://fonts.google.com/specimen/Inter) — tipografías.
