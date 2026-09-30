import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

let transporter: nodemailer.Transporter | null = null;
let transporterPromise: Promise<nodemailer.Transporter> | null = null;

export async function getTransporter() {
  if (transporter) {
    return transporter;
  }

  if (!transporterPromise) {
    transporterPromise = (async () => {
      if (env.etherealUser && env.etherealPassword) {
        return nodemailer.createTransport({
          host: env.etherealHost,
          port: env.etherealPort,
          secure: env.etherealPort === 465,
          connectionTimeout: 10000,
          greetingTimeout: 10000,
          socketTimeout: 20000,
          auth: {
            user: env.etherealUser,
            pass: env.etherealPassword,
          },
        });
      }

      const account = await nodemailer.createTestAccount();
      return nodemailer.createTransport({
        host: account.smtp.host,
        port: account.smtp.port,
        secure: account.smtp.secure,
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 20000,
        auth: {
          user: account.user,
          pass: account.pass,
        },
      });
    })();
  }

  try {
    transporter = await transporterPromise;
    return transporter;
  } catch (error) {
    transporterPromise = null;
    throw error;
  }
}

export async function sendEmailWithTransport({
  to,
  subject,
  body,
  from = 'ReachInbox Scheduler <no-reply@reachinbox.local>',
}: {
  to: string;
  subject: string;
  body: string;
  from?: string;
}) {
  const transport = await getTransporter();
  const info = await transport.sendMail({
    from,
    to,
    subject,
    text: body,
    html: `<p>${body.replace(/\n/g, '<br/>')}</p>`,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info) ?? undefined;
  if (previewUrl) {
    console.log(`Ethereal preview: ${previewUrl}`);
  }

  return {
    response: info.response,
    messageId: info.messageId,
    previewUrl,
  };
}
