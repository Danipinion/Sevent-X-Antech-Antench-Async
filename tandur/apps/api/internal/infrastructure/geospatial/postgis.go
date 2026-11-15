package geospatial

import "math"

type Coordinates struct {
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
}

// CalculateHaversineDistance returns distance in kilometers between two points
func CalculateHaversineDistance(p1, p2 Coordinates) float64 {
	const earthRadius = 6371.0 // kilometers

	dLat := (p2.Latitude - p1.Latitude) * (math.Pi / 180.0)
	dLon := (p2.Longitude - p1.Longitude) * (math.Pi / 180.0)

	lat1 := p1.Latitude * (math.Pi / 180.0)
	lat2 := p2.Latitude * (math.Pi / 180.0)

	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Sin(dLon/2)*math.Sin(dLon/2)*math.Cos(lat1)*math.Cos(lat2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))

	return earthRadius * c
}

