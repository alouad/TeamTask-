import amqp from 'amqplib';

let channel = null;
let connection = null;

/**
 * Connect to the RabbitMQ Message Broker
 */
export async function connectRabbitMQ() {
  const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://localhost';
  try {
    connection = await amqp.connect(rabbitmqUrl);
    channel = await connection.createChannel();
    
    // Assert topic exchange for event communication
    await channel.assertExchange('task_events', 'topic', { durable: true });
    console.log('Connected to RabbitMQ successfully');
  } catch (error) {
    console.error('Failed to connect to RabbitMQ. Retrying in 5 seconds...', error.message);
    setTimeout(connectRabbitMQ, 5000);
  }
}

/**
 * Publish an event to the RabbitMQ exchange
 * @param {string} routingKey - The routing key (e.g., 'task.status_changed')
 * @param {object} message - The event payload
 */
export function publishEvent(routingKey, message) {
  if (!channel) {
    console.error('RabbitMQ channel not initialized. Cannot publish event.');
    return;
  }
  try {
    const data = Buffer.from(JSON.stringify(message));
    channel.publish('task_events', routingKey, data, { persistent: true });
    console.log(`[RabbitMQ] Published event '${routingKey}':`, message);
  } catch (error) {
    console.error('[RabbitMQ] Error publishing event:', error.message);
  }
}
