package auth

import (
	"context"
	"fmt"
	"github.com/coreos/go-oidc/v3/oidc"
	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v4"
)

type Claims struct {
	jwt.RegisteredClaims
	Sub        string `json:"sub"`
	Username   string `json:"preferred_username"`
	Name       string `json:"name"`
	GivenName  string `json:"given_name"`
	FamilyName string `json:"family_name"`
}

func NewKeycloakJWTValidator(issuerUrl, clientId string) (func(*fiber.Ctx, string) (bool, error), error) {
	ctx := context.Background()
	provider, err := oidc.NewProvider(ctx, issuerUrl)
	if err != nil {
		return nil, err
	}
	verifier := provider.Verifier(&oidc.Config{
		ClientID: clientId,
	})
	return func(c *fiber.Ctx, key string) (bool, error) {
		var ctx = c.UserContext()
		_, err := verifier.Verify(ctx, key)
		if err != nil {
			return false, err
		}
		token, _ := jwt.ParseWithClaims(key, &Claims{},
			func(token *jwt.Token) (interface{}, error) {
				if _, ok := token.Method.(*jwt.SigningMethodRSA); !ok {
					return nil, fmt.Errorf("unexpected signing method: %v",
						token.Header["alg"])
				}
				return key, nil
			})

		c.Locals("claims", token.Claims)
		c.Locals("userId", token.Claims.(*Claims).Sub)
		return true, nil
	}, nil
}
