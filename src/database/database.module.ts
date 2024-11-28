import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { config } from 'dotenv';
import { User } from 'src/users/entities/user.entity';
config({
  path: ['.env', '.env.production', '.env.local'],
});

const dbHost =
  process.env.ENV === 'development'
    ? process.env.DB_DEV_HOST
    : process.env.DB_PROD_HOST;

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Ensures that the ConfigModule is available throughout the app
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: dbHost,
      port: parseInt(process.env.DB_PORT, 10) || 5432,
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      synchronize: true, // Development use only
      //   logging: true,
      ssl: {
        rejectUnauthorized: false,
      },
      autoLoadEntities: true,
      migrations: [__dirname + '/migrations/**/*{.ts,.js}'],
      migrationsTableName: 'migrations',
      subscribers: [__dirname + '/subscribers/**/*{.ts,.js}'],
    }),
    TypeOrmModule.forFeature([User]), // Add repositories or entities here
  ],
})
export class DatabaseModule {}
