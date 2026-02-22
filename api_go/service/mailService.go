package service

import (
	"api_go/config"
	"fmt"
	"net/smtp"
	"strings"
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

	auth := smtp.PlainAuth("", m.smtpConfig.Username, m.smtpConfig.Password, m.smtpConfig.Host)
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
