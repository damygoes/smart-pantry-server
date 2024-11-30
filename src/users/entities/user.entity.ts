import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  googleId: string;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  profilePicture: string;

  @Column({ default: false })
  verified: boolean;

  @Column({ nullable: true })
  firstName: string;

  @Column({ nullable: true })
  lastName: string;

  // Method to extract first and last name from email
  updateNamesFromEmail() {
    if (this.email) {
      // Extract the part before '@' as first name, and after '@' as last name
      const emailParts = this.email.split('@')[0].split('.');

      // Set the first part as the first name
      this.firstName = emailParts[0] || null;

      // If there's more than one part (split by '.'), treat the second part as last name
      this.lastName = emailParts.length > 1 ? emailParts[1] : null;
    }
  }
}
