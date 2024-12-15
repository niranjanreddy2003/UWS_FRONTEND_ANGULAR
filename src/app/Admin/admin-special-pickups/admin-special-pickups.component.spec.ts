import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminSpecialPickupsComponent } from './admin-special-pickups.component';

describe('AdminSpecialPickupsComponent', () => {
  let component: AdminSpecialPickupsComponent;
  let fixture: ComponentFixture<AdminSpecialPickupsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminSpecialPickupsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminSpecialPickupsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
