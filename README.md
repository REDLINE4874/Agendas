# Agenda de Prospectos

Aplicación web estática para registrar y dar seguimiento a prospectos de tarjetas de crédito. La información se almacena en Google Sheets mediante Google Apps Script.

## Funcionalidades

- Crear, consultar, editar y eliminar prospectos.
- Ver seguimientos programados para el día actual.
- Filtrar y agrupar prospectos por mes.
- Copiar teléfonos desde la agenda.
- Cambiar entre tema claro y oscuro.
- Elegir un color de fondo; esta acción activa el modo claro automáticamente.
- Guardar la configuración de conexión en `localStorage`.

## Estructura del proyecto

```text
Agendas/
├── index.html                    # Página principal
├── README.md                     # Documentación del proyecto
├── assets/
│   └── icons/                    # Iconos y favicon
├── backend/
│   └── apps-script.gs            # API para Google Apps Script
└── src/
    ├── components/
    │   └── theme-toggle.js       # Componente Web para el tema
    ├── js/
    │   ├── app.js                # Punto de entrada e inicialización
    │   └── modules/
    │       ├── core.js           # Estado global y constantes
    │       ├── custom-selects.js # Selectores personalizados
    │       ├── config.js         # Configuración local
    │       ├── ui.js             # Interacciones de interfaz
    │       ├── navigation.js     # Navegación entre pestañas
    │       ├── api.js            # Comunicación con Apps Script
    │       ├── filters.js        # Filtros y fechas
    │       ├── views.js          # Renderizado de vistas
    │       └── actions.js        # Acciones de prospectos
    └── styles/
        ├── main.css              # Entrada principal de estilos
        └── modules/
            ├── base.css          # Variables y estilos base
            ├── forms.css         # Formularios e inputs
            ├── controls.css      # Botones y controles
            ├── tables.css        # Tablas y agrupaciones
            ├── config.css        # Panel de configuración
            ├── feedback.css      # Toasts, loaders y estados
            ├── theme.css         # Tema oscuro
            ├── responsive.css    # Adaptación responsive
            └── modal.css         # Modal de notas
```

La lógica JavaScript está separada en módulos dentro de `src/js/modules/`. Los estilos están organizados en `src/styles/modules/` y se cargan desde `src/styles/main.css` mediante `@import`.

El componente [`theme-background-picker.js`](./src/components/theme-background-picker.js) permite elegir el color de fondo y ajusta el contraste de la interfaz. Al seleccionar un fondo personalizado se activa el modo claro automáticamente.

## Uso local

No requiere Node.js ni un proceso de compilación.

1. Descarga o clona el repositorio.
2. Abre `index.html` en un navegador.
3. Para una experiencia más estable, sirve la carpeta con cualquier servidor estático local.

También puedes usar la extensión **Live Server** de Visual Studio Code y abrir `index.html` con **Open with Live Server**.

## Configuración de Google Sheets

1. Crea o abre una hoja de cálculo de Google.
2. Abre **Extensiones > Apps Script**.
3. Copia el contenido de [`backend/apps-script.gs`](./backend/apps-script.gs) en el editor de Apps Script.
4. Guarda el proyecto.
5. Selecciona **Implementar > Nueva implementación**.
6. Elige **Aplicación web**.
7. Configura la ejecución como tú mismo y el acceso como **Cualquier usuario**.
8. Implementa y copia la URL generada.
9. En la pestaña **Configuración** de la aplicación, pega la URL en el campo **URL KEY**.
10. Mantén `Prospectos` como nombre de la hoja, salvo que utilices otro nombre.
11. Presiona el botón de prueba para confirmar la conexión.

La hoja se crea automáticamente si no existe. Sus columnas son:

```text
ID | Nombre | Teléfono | Producto | Estatus | Seguimiento | Notas | Fecha registro
```

## Comunicación con el backend

La aplicación utiliza JSONP para consultar datos y solicitudes sin credenciales de navegador para guardar, editar y eliminar registros. El backend admite estas acciones mediante el parámetro `accion`:

- `listar`
- `guardar`
- `editar`
- `eliminar`

La URL de Apps Script y el nombre de la hoja se almacenan localmente en el navegador mediante `localStorage`.

## Dependencias externas

- Google Material Symbols Rounded para los iconos de la interfaz.
- Google Apps Script y Google Sheets para persistencia de datos.
