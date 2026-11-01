package cache

import (
	"sync"
	"time"
)

type entry struct {
	value     float64
	expiresAt time.Time
}

type TTLCache struct {
	mu    sync.RWMutex
	ttl   time.Duration
	items map[string]entry
}

func NewTTLCache(ttl time.Duration) *TTLCache {
	return &TTLCache{ttl: ttl, items: map[string]entry{}, mu: sync.RWMutex{}}
}

func (c *TTLCache) Get(key string) (float64, bool) {
	if c == nil {
		return 0, false
	}

	c.mu.RLock()
	item, ok := c.items[key]
	if ok && !time.Now().After(item.expiresAt) {
		c.mu.RUnlock()
		return item.value, true
	}
	c.mu.RUnlock()
	if !ok {
		return 0, false
	}

	c.mu.Lock()
	defer c.mu.Unlock()
	item, ok = c.items[key]
	if !ok {
		return 0, false
	}
	if time.Now().After(item.expiresAt) {
		delete(c.items, key)
		return 0, false
	}
	return item.value, true
}

func (c *TTLCache) Set(key string, value float64) {
	if c == nil {
		return
	}

	c.mu.Lock()
	defer c.mu.Unlock()
	if c.items == nil {
		c.items = map[string]entry{}
	}
	c.items[key] = entry{value: value, expiresAt: time.Now().Add(c.ttl)}
}
