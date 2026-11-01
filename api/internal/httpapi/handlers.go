package httpapi

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"keyrail.local/wallet-portfolio/internal/models"
	"keyrail.local/wallet-portfolio/internal/provider"
	"keyrail.local/wallet-portfolio/internal/service"
)

type portfolioService interface {
	Summary(ctx context.Context, address string) (models.PortfolioResponse, error)
}

type Handler struct {
	portfolio portfolioService
}

func NewHandler(portfolio portfolioService) *Handler {
	return &Handler{portfolio: portfolio}
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	address := strings.TrimSuffix(strings.TrimPrefix(r.URL.Path, "/api/wallets/"), "/portfolio")

	portfolio, err := h.portfolio.Summary(r.Context(), address)
	if err != nil {
		status, code := serviceErrorStatus(err)
		writeError(w, status, code, err)
		return
	}

	writeJSON(w, http.StatusOK, portfolio)
}

func serviceErrorStatus(err error) (int, string) {
	switch {
	case errors.Is(err, service.ErrInvalidAddress):
		return http.StatusBadRequest, "invalid_address"
	case errors.Is(err, provider.ErrWalletNotFound):
		return http.StatusNotFound, "wallet_not_found"
	default:
		return http.StatusInternalServerError, "internal_error"
	}
}

func writeError(w http.ResponseWriter, status int, code string, err error) {
	message := ""
	if err != nil {
		message = err.Error()
	}
	writeJSON(w, status, models.ErrorBody{
		Error: models.ErrorDetail{
			Code:    code,
			Message: message,
		},
	})
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
