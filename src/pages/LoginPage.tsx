import React, { useState } from 'react';
import { useUser } from '../hooks/useUser';
import { Role } from '../types';
import Button from '../components/Button';
import Card from '../components/Card';
import Input from '../components/Input';

const LoginPage: React.FC = () => {
  const { login } = useUser();
  const [username, setUsername] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    if (username.trim().toLowerCase() === 'ahmed') {
      login('ahmed', Role.Admin);
    } else {
      login(username.trim(), Role.Patient);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-pink-light p-4">
      <Card className="w-full max-w-md text-center">
        <div className="mx-auto mb-6">
          <svg className="h-16 w-16 text-brand-pink mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-brand-pink-dark mb-2">مرحباً بك في مساعد الحمل الذكي</h1>
        <p className="text-brand-gray-dark mb-8">يرجى إدخال اسم المستخدم للمتابعة</p>
        
        <form onSubmit={handleLogin} className="space-y-6">
          <Input
            id="username"
            label="اسم المستخدم"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="أدخل اسم المستخدم"
            required
            autoFocus
          />
          <Button type="submit" className="w-full text-lg">
            تسجيل الدخول
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default LoginPage;