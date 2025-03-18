package controllers

import "github.com/gofiber/fiber/v2"

func GetLocal[T any](c *fiber.Ctx, key string) T {
	return c.Locals(key).(T)
}
