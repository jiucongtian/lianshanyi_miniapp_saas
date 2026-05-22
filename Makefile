.PHONY: dev dev-api dev-web seed admin test-api build-api build-web clean

# Start full dev stack (requires docker)
dev:
	docker-compose up

# Start just API + infra (without web container)
dev-infra:
	docker-compose up mongo redis minio

# Run API locally (without docker)
dev-api:
	cd apps/api && npm run dev

# Run web locally (without docker)
dev-web:
	cd apps/web && npm run dev

# Seed database (docker must be running)
seed:
	cd apps/api && MONGO_URI=mongodb://localhost:27017/lianshanyi_dev npm run seed

# Create first admin
admin:
	cd apps/api && MONGO_URI=mongodb://localhost:27017/lianshanyi_dev npm run admin:create

# Run backend tests
test-api:
	cd apps/api && npm test

# Run frontend tests
test-web:
	cd apps/web && npm test

# Build API
build-api:
	cd apps/api && npm run build

# Build web
build-web:
	cd apps/web && npm run build

# Install all deps
install:
	cd apps/api && npm install
	cd apps/web && npm install

# Clean build artifacts
clean:
	rm -rf apps/api/dist apps/web/dist
