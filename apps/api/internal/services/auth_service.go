package services

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/pixelly/api/internal/dto"
	"github.com/pixelly/api/internal/models"
	"github.com/pixelly/api/internal/repository"
	pkgjwt "github.com/pixelly/api/pkg/jwt"
	"github.com/pixelly/api/pkg/password"
)

type AuthService struct {
	userRepo  *repository.UserRepository
	jwtSecret string
}

func NewAuthService(userRepo *repository.UserRepository, jwtSecret string) *AuthService {
	return &AuthService{userRepo: userRepo, jwtSecret: jwtSecret}
}

func (s *AuthService) Register(ctx context.Context, req *dto.RegisterRequest) (*dto.AuthResponse, error) {
	exists, err := s.userRepo.EmailExists(ctx, req.Email)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, errors.New("email already registered")
	}

	hash, err := password.Hash(req.Password)
	if err != nil {
		return nil, err
	}

	user := &models.User{
		ID:           uuid.New(),
		Email:        req.Email,
		PasswordHash: hash,
		Name:         req.Name,
	}

	if err := s.userRepo.Create(ctx, user); err != nil {
		return nil, err
	}

	token, err := pkgjwt.Generate(user.ID, user.Email, s.jwtSecret)
	if err != nil {
		return nil, err
	}

	return &dto.AuthResponse{
		Token: token,
		User: dto.UserResponse{
			ID:        user.ID.String(),
			Email:     user.Email,
			Name:      user.Name,
			AvatarURL: user.AvatarURL,
		},
	}, nil
}

func (s *AuthService) Login(ctx context.Context, req *dto.LoginRequest) (*dto.AuthResponse, error) {
	user, err := s.userRepo.FindByEmail(ctx, req.Email)
	if err != nil {
		return nil, errors.New("invalid credentials")
	}

	if !password.Verify(req.Password, user.PasswordHash) {
		return nil, errors.New("invalid credentials")
	}

	token, err := pkgjwt.Generate(user.ID, user.Email, s.jwtSecret)
	if err != nil {
		return nil, err
	}

	return &dto.AuthResponse{
		Token: token,
		User: dto.UserResponse{
			ID:        user.ID.String(),
			Email:     user.Email,
			Name:      user.Name,
			AvatarURL: user.AvatarURL,
		},
	}, nil
}
