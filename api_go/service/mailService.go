package service

import (
	"api_go/config"
	"fmt"
	"html"
	"net/smtp"
	"strings"
	"time"
	// The runtime image is FROM scratch without a zoneinfo database; embed it so
	// reminder mails show Berlin time instead of silently falling back to UTC.
	_ "time/tzdata"
)

type MailService struct {
	smtpConfig config.AppConfigSMTP
}

func NewMailService(smtpConfig config.AppConfigSMTP) MailService {
	return MailService{smtpConfig: smtpConfig}
}

func (m *MailService) SendClubInvitationEmail(to string, clubName string, inviterName string, invitationURL string) error {
	if !m.smtpConfig.Enabled || m.smtpConfig.Host == "" {
		return nil
	}

	subject := fmt.Sprintf("Einladung zu %s", clubName)
	htmlBody := buildInvitationHTML(clubName, inviterName, invitationURL)

	message := []byte("MIME-version: 1.0;\r\n" +
		"Content-Type: text/html; charset=\"UTF-8\";\r\n" +
		fmt.Sprintf("From: %s\r\n", m.smtpConfig.FromAddress) +
		fmt.Sprintf("To: %s\r\n", to) +
		fmt.Sprintf("Subject: %s\r\n\r\n", subject) +
		htmlBody)

	var auth smtp.Auth
	if strings.TrimSpace(m.smtpConfig.Username) != "" || strings.TrimSpace(m.smtpConfig.Password) != "" {
		auth = smtp.PlainAuth("", m.smtpConfig.Username, m.smtpConfig.Password, m.smtpConfig.Host)
	}
	addr := fmt.Sprintf("%s:%d", m.smtpConfig.Host, m.smtpConfig.Port)
	return smtp.SendMail(addr, auth, m.smtpConfig.FromAddress, []string{to}, message)
}

func buildInvitationHTML(clubName string, inviterName string, invitationURL string) string {
	inviterText := strings.TrimSpace(inviterName)
	if inviterText == "" {
		inviterText = "Ein Vereinsmitglied"
	}

	return fmt.Sprintf(`
<html>
  <body style="font-family: Arial, sans-serif; background: #f4f7fb; padding: 24px;">
    <div style="max-width: 640px; margin: 0 auto; background: #ffffff; border: 1px solid #d5dee8; border-radius: 12px; overflow: hidden;">
      <div style="background: #0d5777; color: #ffffff; padding: 16px 20px; font-size: 20px; font-weight: 700;">
        Einladung zu SmartOrganizr
      </div>
      <div style="padding: 24px 20px; color: #1f2937; line-height: 1.6;">
        <p>Hallo,</p>
        <p><strong>%s</strong> hat dich in den Verein <strong>%s</strong> eingeladen.</p>
        <p>Über den folgenden Link kannst du die Einladung ansehen und annehmen:</p>
        <p style="margin: 24px 0;">
          <a href="%s" style="background: #0d5777; color: #ffffff; text-decoration: none; padding: 12px 18px; border-radius: 8px; display: inline-block; font-weight: 600;">
            Einladung öffnen
          </a>
        </p>
        <p style="font-size: 13px; color: #64748b;">Falls der Button nicht funktioniert, kopiere diesen Link in den Browser:<br/>%s</p>
      </div>
    </div>
  </body>
</html>`, inviterText, clubName, invitationURL, invitationURL)
}

func (m *MailService) send(to, subject, htmlBody string) error {
	if !m.smtpConfig.Enabled || m.smtpConfig.Host == "" {
		return nil
	}
	message := []byte("MIME-version: 1.0;\r\n" +
		"Content-Type: text/html; charset=\"UTF-8\";\r\n" +
		fmt.Sprintf("From: %s\r\n", m.smtpConfig.FromAddress) +
		fmt.Sprintf("To: %s\r\n", to) +
		fmt.Sprintf("Subject: %s\r\n\r\n", subject) +
		htmlBody)
	var auth smtp.Auth
	if strings.TrimSpace(m.smtpConfig.Username) != "" || strings.TrimSpace(m.smtpConfig.Password) != "" {
		auth = smtp.PlainAuth("", m.smtpConfig.Username, m.smtpConfig.Password, m.smtpConfig.Host)
	}
	addr := fmt.Sprintf("%s:%d", m.smtpConfig.Host, m.smtpConfig.Port)
	return smtp.SendMail(addr, auth, m.smtpConfig.FromAddress, []string{to}, message)
}

// germanTime formats an event start for German readers in Berlin time.
func germanTime(t time.Time) string {
	loc, err := time.LoadLocation("Europe/Berlin")
	if err != nil {
		loc = time.UTC
	}
	lt := t.In(loc)
	weekdays := []string{"Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"}
	return fmt.Sprintf("%s, %s um %s Uhr", weekdays[lt.Weekday()], lt.Format("02.01.2006"), lt.Format("15:04"))
}

// SendEventReminderEmail asks a member to answer an event they have not responded to.
func (m *MailService) SendEventReminderEmail(to, name, clubName, summary, location string, start time.Time, url string) error {
	subject := fmt.Sprintf("Bitte zu- oder absagen: %s", summary)
	return m.send(to, subject, BuildEventReminderHTML(name, clubName, summary, location, start, url))
}

// BuildEventReminderHTML renders the reminder mail; all user content is escaped.
func BuildEventReminderHTML(name, clubName, summary, location string, start time.Time, url string) string {
	greeting := "Hallo"
	if strings.TrimSpace(name) != "" {
		greeting = "Hallo " + html.EscapeString(strings.TrimSpace(name))
	}
	where := ""
	if strings.TrimSpace(location) != "" {
		where = fmt.Sprintf("<br/>Ort: %s", html.EscapeString(location))
	}
	return fmt.Sprintf(`
<html>
  <body style="font-family: Arial, sans-serif; background: #f4f7fb; padding: 24px;">
    <div style="max-width: 640px; margin: 0 auto; background: #ffffff; border: 1px solid #d5dee8; border-radius: 12px; overflow: hidden;">
      <div style="background: #0d5777; color: #ffffff; padding: 16px 20px; font-size: 20px; font-weight: 700;">
        %s
      </div>
      <div style="padding: 24px 20px; color: #1f2937; line-height: 1.6;">
        <p>%s,</p>
        <p>für den folgenden Termin fehlt noch deine Rückmeldung:</p>
        <p style="font-size: 18px;"><strong>%s</strong><br/>%s%s</p>
        <p>Bitte sag kurz zu oder ab, damit die Planung steht.</p>
        <p style="margin: 24px 0;">
          <a href="%s" style="background: #0d5777; color: #ffffff; text-decoration: none; padding: 12px 18px; border-radius: 8px; display: inline-block; font-weight: 600;">
            Jetzt antworten
          </a>
        </p>
        <p style="font-size: 13px; color: #64748b;">Du bekommst diese Erinnerung, weil dein Verein Erinnerungen für offene Zusagen eingeschaltet hat.</p>
      </div>
    </div>
  </body>
</html>`, html.EscapeString(clubName), greeting, html.EscapeString(summary), germanTime(start), where, html.EscapeString(url))
}
