// 🔥 Inicializa EmailJS (reemplaza con tu publicKey real)
emailjs.init("Ko2ULs8Z_QOKK6kML"); // ← Tu EmailJS publicKey

// 🔥 Configuración de Firebase (reemplaza con tus datos)
const firebaseConfig = {
  apiKey: "AIzaSyAMQCAkB5A-M61o7nu-lJI_w9Uc1zACEBI",
  authDomain: "turnos-web-112e3.firebaseapp.com",
  projectId: "turnos-web-112e3",
  storageBucket: "turnos-web-112e3.firebasestorage.app",
  messagingSenderId: "816778874343",
  appId: "1:816778874343:web:4e9dba01360f26c4b80142",
  measurementId: "G-D7NYXCPWGN"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Cuando la página carga
document.addEventListener("DOMContentLoaded", function () {
  // Inicializar Flatpickr (calendario)
  flatpickr("#fecha", {
    dateFormat: "Y-m-d",
    minDate: "today",
    locale: "es",
    // Deshabilitar DOMINGOS (0) y Lunes (1)
  // 0 = Domingo, 1 = Lunes, 2 = Martes, ..., 6 = Sábado
  disable: [
    "2025-04-18", // Feriado
  "2025-05-01", // Día del Trabajador
    function(date) {
      return date.getDay() === 0 || date.getDay() === 1; // Domingo y Lunes
    }
  ],
    onChange: function (selectedDates, dateStr) {
      cargarHorariosDisponibles(dateStr);
    }
  });

  // Cargar horarios disponibles (solo los que NO están ocupados)
  function cargarHorariosDisponibles(fecha) {
    const selectHora = document.getElementById("hora");
    selectHora.innerHTML = '<option value="">Cargando horarios...</option>';
 // Días especiales (podés agregar más)
  const horariosEspeciales = {
    "2025-04-10": ["9:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00"], // Solo hasta las 15
    "2025-04-15": ["14:00", "15:00", "16:00", "17:00"] // Solo tarde
  };
    // Todos los horarios posibles (9:00 a 18:00 cada 30 min)
    const todosHorarios = [];
    for (let h = 9; h <= 18; h++) {
      todosHorarios.push(`${h}:00`);
      todosHorarios.push(`${h}:30`);
    }
    todosHorarios.push("19:00");

    // Consultar Firestore: ¿qué turnos hay para esta fecha?
    db.collection("turnos")
      .where("fecha", "==", fecha)
      .get()
      .then((querySnapshot) => {
        const ocupados = [];
        querySnapshot.forEach((doc) => {
          ocupados.push(doc.data().hora);
        });

        // Filtrar: solo horarios no ocupados
        const disponibles = todosHorarios.filter(hora => !ocupados.includes(hora));

        // Mostrar en el <select>
        selectHora.innerHTML = "";
        if (disponibles.length === 0) {
          const option = document.createElement("option");
          option.value = "";
          option.textContent = "No hay horarios disponibles";
          option.disabled = true;
          selectHora.appendChild(option);
        } else {
          disponibles.forEach(hora => {
            const option = document.createElement("option");
            option.value = hora;
            option.textContent = hora;
            selectHora.appendChild(option);
          });
        }
      })
      .catch((error) => {
        selectHora.innerHTML = "";
        const option = document.createElement("option");
        option.value = "";
        option.textContent = "Error al cargar horarios";
        selectHora.appendChild(option);
        console.error("Error al obtener turnos:", error);
      });
  }

  // Manejar el envío del formulario
  const formulario = document.getElementById("turnoForm");
  const mensajeDiv = document.getElementById("mensaje");

  formulario.addEventListener("submit", function (e) {
    e.preventDefault();

    const servicio = document.getElementById("servicio").value;
    const fecha = document.getElementById("fecha").value;
    const hora = document.getElementById("hora").value;
    const nombre = document.getElementById("nombre").value;
    const email = document.getElementById("email").value;

    mensajeDiv.className = "";
    mensajeDiv.textContent = "";

    // ID único del turno
    const turnoId = `${fecha}-${hora}`;
    const turnoRef = db.collection("turnos").doc(turnoId);

    // ✅ Ya no necesitamos verificar si existe, porque solo mostramos los disponibles
    // Pero por seguridad, volvemos a verificar
    turnoRef.get().then((docSnapshot) => {
      if (docSnapshot.exists) {
        mensajeDiv.textContent = "❌ Este horario ya no está disponible. Por favor, elige otro.";
        mensajeDiv.classList.add("mensaje-error");
        cargarHorariosDisponibles(fecha); // Refresca los horarios
      } else {
        // Guardar en Firebase
        turnoRef.set({
          nombre: nombre,
          email: email,
          servicio: servicio,
          fecha: fecha,
          hora: hora,
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
        })
        .then(() => {
          // Enviar email
          return emailjs.send(
  "service_agus",        // ✅ Reemplaza "agustinleguizamon" por tu serviceID real
  "template_ovpoaoh",     // ✅ Este está bien (templateID)
  {
    nombre: nombre,
    email: email,
    servicio: servicio,
    fecha: fecha,
    hora: hora
  }
);
        })
        .then(() => {
          mensajeDiv.textContent = `✅ ¡Gracias, ${nombre}! Tu turno ha sido confirmado para el ${fecha} a las ${hora}. Revisa tu email para confirmar.`;
          mensajeDiv.classList.add("mensaje-exito");
          formulario.reset();
          document.getElementById("hora").innerHTML = '<option value="">Selecciona una fecha</option>';
        })
        .catch((error) => {
          // Aunque falle el email, el turno ya está guardado
          mensajeDiv.textContent = `✅ ¡Gracias, ${nombre}! Tu turno está confirmado. Si no recibís el email, contactanos.`;
          mensajeDiv.classList.add("mensaje-exito");
          formulario.reset();
          document.getElementById("hora").innerHTML = '<option value="">Selecciona una fecha</option>';
          console.error("Error EmailJS:", error);
        });
      }
    }).catch((error) => {
      mensajeDiv.textContent = "❌ No se pudo verificar el horario. Intenta de nuevo.";
      mensajeDiv.classList.add("mensaje-error");
      console.error("Firestore error:", error);
    });
  });
});