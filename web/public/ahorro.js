// ============================================================
// ahorro.js — Comparador de ahorro (página ahorro.html)
// Estimación orientativa: rangos de mejora de eficiencia al pasar
// a caldera de condensación, según el tipo de caldera actual.
// Factores: precio medio del gas ~0,09 €/kWh; emisión ~0,18 kg CO2/kWh.
// ============================================================
(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  var input = $("gastoAnual");
  if (!input) return; // solo existe en ahorro.html

  // [mínimo, máximo] de ahorro sobre la factura según la caldera actual
  var RANGOS = {
    atmosferica: [0.25, 0.30],
    estanca: [0.15, 0.20],
    condensacion: [0.0, 0.05]
  };
  var EUR_KWH = 0.09;   // €/kWh de gas (orientativo)
  var CO2_KWH = 0.18;   // kg CO2 por kWh de gas

  var eur = function (n) {
    return Math.round(n).toLocaleString("es-ES") + " €";
  };

  function tipoActual() {
    var checked = document.querySelector('input[name="tipo"]:checked');
    return checked ? checked.value : "atmosferica";
  }

  function calcular() {
    var gasto = Number(input.value);
    if (!isFinite(gasto) || gasto <= 0) gasto = 0;
    gasto = Math.min(Math.max(gasto, 0), 20000);

    var rango = RANGOS[tipoActual()] || RANGOS.atmosferica;
    var minAhorro = gasto * rango[0];
    var maxAhorro = gasto * rango[1];
    var medio = (minAhorro + maxAhorro) / 2;

    if (gasto === 0) {
      $("ahorroAnual").textContent = "—";
      $("ahorroDecada").textContent = "—";
      $("ahorroCO2").textContent = "—";
      $("facturaNueva").textContent = "—";
      $("ahorroNota").textContent = "Escribe tu gasto anual de gas para ver la estimación.";
      return;
    }

    if (rango[1] <= 0.05) {
      $("ahorroAnual").textContent = eur(minAhorro) + " – " + eur(maxAhorro);
      $("ahorroNota").textContent = "Tu caldera ya es de condensación: el margen de mejora es pequeño. Aún así, un buen mantenimiento y un termostato modulante pueden arañar algo más.";
    } else {
      $("ahorroAnual").textContent = eur(minAhorro) + " – " + eur(maxAhorro);
      $("ahorroNota").textContent = "Además, las calderas nuevas son más silenciosas, más seguras y con hasta 5 años de garantía.";
    }
    $("ahorroDecada").textContent = eur(medio * 10);
    var kwh = gasto / EUR_KWH;
    var co2kg = kwh * ((rango[0] + rango[1]) / 2) * CO2_KWH;
    $("ahorroCO2").textContent = Math.round(co2kg).toLocaleString("es-ES") + " kg";
    $("facturaNueva").textContent = eur(gasto - medio) + "/año";
  }

  input.addEventListener("input", calcular);
  $("tipoCaldera").addEventListener("change", calcular);
  calcular();
})();
