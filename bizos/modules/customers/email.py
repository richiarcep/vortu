import imaplib
import smtplib
import email
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.header import decode_header
from datetime import datetime
from sqlalchemy.orm import Session
from models.customer import Contact, Message, EmailConfig


def decode_str(s):
    """Safely decode email headers."""
    if s is None:
        return ""
    decoded = decode_header(s)
    result = ""
    for part, enc in decoded:
        if isinstance(part, bytes):
            result += part.decode(enc or "utf-8", errors="replace")
        else:
            result += part
    return result


def get_email_body(msg) -> str:
    """Extract plain text body from email message."""
    body = ""
    if msg.is_multipart():
        for part in msg.walk():
            content_type = part.get_content_type()
            disposition = str(part.get("Content-Disposition") or "")
            if content_type == "text/plain" and "attachment" not in disposition:
                try:
                    body = part.get_payload(decode=True).decode(
                        part.get_content_charset() or "utf-8", errors="replace"
                    )
                    break
                except Exception:
                    continue
    else:
        try:
            body = msg.get_payload(decode=True).decode(
                msg.get_content_charset() or "utf-8", errors="replace"
            )
        except Exception:
            body = str(msg.get_payload())
    return body.strip()


def fetch_new_emails(db: Session, company_id: int) -> list:
    """
    Connects to IMAP, fetches unread emails,
    creates Contact and Message records for each.
    Returns list of new message dicts.
    """
    config = db.query(EmailConfig).filter(
        EmailConfig.company_id == company_id,
        EmailConfig.is_connected == True
    ).first()

    if not config:
        return []

    new_messages = []

    try:
        # ── Connect to IMAP ───────────────────────────────────────────────────
        mail = imaplib.IMAP4_SSL(config.imap_host, config.imap_port)
        mail.login(config.email, config.password)
        mail.select("INBOX")

        # Search for unseen emails
        _, message_numbers = mail.search(None, "UNSEEN")

        for num in message_numbers[0].split():
            try:
                _, msg_data = mail.fetch(num, "(RFC822)")
                raw_email = msg_data[0][1]
                msg = email.message_from_bytes(raw_email)

                # Extract fields
                subject     = decode_str(msg.get("Subject", "Sin asunto"))
                from_header = decode_str(msg.get("From", ""))
                body        = get_email_body(msg)

                # Parse sender name and email
                sender_name  = from_header.split("<")[0].strip().strip('"') or "Cliente"
                sender_email = ""
                if "<" in from_header and ">" in from_header:
                    sender_email = from_header.split("<")[1].split(">")[0].strip()
                elif "@" in from_header:
                    sender_email = from_header.strip()

                if not body:
                    continue

                # ── Find or create contact ────────────────────────────────────
                contact = None
                if sender_email:
                    contact = db.query(Contact).filter(
                        Contact.company_id == company_id,
                        Contact.email == sender_email
                    ).first()

                if not contact:
                    contact = Contact(
                        company_id=company_id,
                        name=sender_name or sender_email,
                        email=sender_email,
                        platform="email",
                    )
                    db.add(contact)
                    db.flush()

                # ── Create message record ─────────────────────────────────────
                full_content = f"Asunto: {subject}\n\n{body}"
                message = Message(
                    company_id=company_id,
                    contact_id=contact.id,
                    platform="email",
                    direction="inbound",
                    content=full_content,
                    status="pending",
                )
                db.add(message)
                db.commit()
                db.refresh(message)

                new_messages.append({
                    "message_id":   message.id,
                    "contact_name": contact.name,
                    "contact_email": sender_email,
                    "subject":      subject,
                    "body":         body,
                })

            except Exception as e:
                print(f"Error processing email {num}: {e}")
                continue

        mail.logout()

        # Update last sync time
        config.last_sync_at = datetime.now()
        db.commit()

    except Exception as e:
        print(f"IMAP connection error: {e}")
        return []

    return new_messages


def send_email_reply(
    db: Session,
    company_id: int,
    to_email: str,
    subject: str,
    body: str,
) -> bool:
    """
    Sends an email reply via SMTP.
    Returns True if successful.
    """
    config = db.query(EmailConfig).filter(
        EmailConfig.company_id == company_id,
        EmailConfig.is_connected == True
    ).first()

    if not config:
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"Re: {subject}" if not subject.startswith("Re:") else subject
        msg["From"]    = config.email
        msg["To"]      = to_email

        part = MIMEText(body, "plain", "utf-8")
        msg.attach(part)

        with smtplib.SMTP(config.smtp_host, config.smtp_port) as server:
            server.ehlo()
            server.starttls()
            server.login(config.email, config.password)
            server.sendmail(config.email, to_email, msg.as_string())

        return True

    except Exception as e:
        print(f"SMTP send error: {e}")
        return False


def test_email_connection(
    imap_host: str,
    imap_port: int,
    email_addr: str,
    password: str,
) -> dict:
    """
    Tests IMAP connection with provided credentials.
    Returns success bool and message.
    """
    try:
        mail = imaplib.IMAP4_SSL(imap_host, imap_port)
        mail.login(email_addr, password)
        mail.select("INBOX")
        _, data = mail.search(None, "ALL")
        total = len(data[0].split()) if data[0] else 0
        mail.logout()
        return {
            "success":      True,
            "message":      f"Conexión exitosa. {total} emails en bandeja de entrada.",
            "total_emails": total,
        }
    except imaplib.IMAP4.error as e:
        return {"success": False, "message": f"Error de autenticación: {str(e)}"}
    except Exception as e:
        return {"success": False, "message": f"Error de conexión: {str(e)}"}