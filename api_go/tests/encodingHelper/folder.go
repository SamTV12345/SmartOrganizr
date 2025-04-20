package encodingHelper

import "encoding/json"

func Encode[T any](value T) string {
	encoded, err := json.Marshal(value)
	if err != nil {
		panic(err)
	}
	return string(encoded)
}

func Decode[T any](value []byte, valueToWrite *T) T {
	err := json.Unmarshal(value, valueToWrite)
	if err != nil {
		panic(err)
	}
	return *valueToWrite
}
