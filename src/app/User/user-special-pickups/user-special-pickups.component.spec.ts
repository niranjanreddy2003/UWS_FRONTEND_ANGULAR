import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserSpecialPickupsComponent } from './user-special-pickups.component';

describe('UserSpecialPickupsComponent', () => {
  let component: UserSpecialPickupsComponent;
  let fixture: ComponentFixture<UserSpecialPickupsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserSpecialPickupsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserSpecialPickupsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
