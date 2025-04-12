"use strict";

const axios = require('axios');
const config = require('../config');

/**
 * Módulo encargado de notificar a la IA cuando debe unirse a un juego.
 * No bloquea ni libera las IAs - pueden jugar múltiples partidas simultáneamente.
 */
class AINotifier {
  constructor() {
    // URL base para la comunicación con el servicio de IA
    this.aiServiceUrl = config.services?.ai_deeppong?.url || 'http://ai_deeppong:3003';
  }

  /**
   * Notifica a la IA que se le ha asignado un juego
   * @param {string} gameId - ID del juego
   * @param {string} aiName - Nombre de la IA
   * @param {number} playerNumber - Número de jugador asignado (1 o 2)
   * @returns {Promise<boolean>} - true si la notificación fue exitosa
   */
  async notifyAI(gameId, aiName, playerNumber) {
    try {
      console.log(`Notificando a la IA ${aiName} sobre el juego ${gameId} como jugador ${playerNumber}`);
      
      // Enviar notificación a la IA
      const response = await axios.post(`${this.aiServiceUrl}/join`, {
        game_id: gameId,
        player_number: playerNumber,
        ai_name: aiName
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000 // 5 segundos de timeout
      });
      
      if (response.status === 200) {
        console.log(`IA ${aiName} notificada exitosamente sobre el juego ${gameId}`);
        return true;
      } else {
        console.error(`Error al notificar a la IA ${aiName}: ${response.status}`);
        return false;
      }
    } catch (error) {
      console.error(`Excepción al notificar a la IA ${aiName}: ${error.message}`);
      return false;
    }
  }

  /**
   * Limpia las notificaciones para un juego específico (no es necesario bloquear/liberar)
   * @param {string} gameId - ID del juego que ha finalizado
   */
  clearNotificationsForGame(gameId) {
    // Solo registramos para propósitos de log, no es necesario realizar ninguna acción
    // ya que las IAs pueden manejar múltiples juegos simultáneamente
    console.log(`Juego ${gameId} finalizado - No es necesario liberar la IA`);
  }
}

// Exportar una única instancia del notificador
module.exports = new AINotifier();