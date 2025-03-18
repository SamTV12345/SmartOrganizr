package routers

import (
	"api_go/config"
	"api_go/controllers"
	"api_go/db"
	"context"
	"fmt"
	"github.com/coreos/go-oidc/v3/oidc"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/keyauth"
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

func SetupRouter(queries *db.Queries, config config.AppConfig) *fiber.App {
	validator, err := NewKeycloakJWTValidator(config.SSO.Issuer, config.SSO.ClientID)
	if err != nil {
		panic(err)
	}

	app := fiber.New()

	app.Get("/api/public", controllers.GetIndex)

	profile := app.Group("api", keyauth.New(keyauth.Config{
		Validator: validator,
	}))

	profile.Route("v1/authors", func(r fiber.Router) {
		r.Get("/", controllers.GetAuthors)
		r.Get("/:authorId/notes", controllers.GetNotes)
		r.Patch("/:authorId", controllers.UpdateAuthor)
		r.Delete("/:authorId", controllers.DeleteAuthor)
		r.Post("/", controllers.CreateAuthor)
	})
	var keycloakModel = controllers.KeycloakModel{
		ClientId: config.SSO.ClientID,
		Url:      config.SSO.Url,
	}

	app.Use(func(c *fiber.Ctx) error {
		SetLocal[*db.Queries](c, "db", queries)
		SetLocal[controllers.KeycloakModel](c, "keycloak", keycloakModel)
		// Go to next middleware:
		return c.Next()
	})
	return app
}

func SetLocal[T any](c *fiber.Ctx, key string, value T) {
	c.Locals(key, value)
}
